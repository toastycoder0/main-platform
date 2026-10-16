import { and, eq, inArray, sql } from 'drizzle-orm';
import { generateId } from '@/infrastructure/db/id';
import { cellLot, lot, movement, movementEntry, warehouseCell } from '@/infrastructure/db/schema';
import { computeNetDeltas, type Transfer } from '../application/warehouse.deltas';

// biome-ignore lint/suspicious/noExplicitAny: Drizzle tx varies between db & transaction
type SelectFn = (...args: readonly any[]) => any;
// biome-ignore lint/suspicious/noExplicitAny: Drizzle tx varies between db & transaction
type InsertFn = (...args: readonly any[]) => any;
// biome-ignore lint/suspicious/noExplicitAny: Drizzle tx varies between db & transaction
type UpdateFn = (...args: readonly any[]) => any;
// biome-ignore lint/suspicious/noExplicitAny: Drizzle tx varies between db & transaction
type DeleteFn = (...args: readonly any[]) => any;

interface DbTx {
  select: SelectFn;
  insert: InsertFn;
  update: UpdateFn;
  delete: DeleteFn;
}

export const MOVEMENT_ERRORS = {
  cellNotFound: (id: string) => `La celda ${id} no existe`,
  cellInactive: (id: string) => `La celda ${id} está inactiva`,
  lotNotFound: (id: string) => `El lote ${id} no existe`,
  lotInactive: (id: string) => `El lote ${id} está inactivo`,
  insufficientStock: (cell: string, current: number, required: number) =>
    `Stock insuficiente en celda ${cell}. Disponible: ${current}, requerido: ${required}`,
  capacityExceeded: (cell: string, capacity: number, occupied: number, adding: number) =>
    `Capacidad insuficiente en celda ${cell}. Capacidad: ${capacity}, ocupado: ${occupied}, a agregar: ${adding}`,
  movementNotFound: (id: string) => `El movimiento ${id} no existe`,
  alreadyReverted: (id: string) => `El movimiento ${id} ya fue deshecho`,
  cannotRevertRevert: (id: string) => `No se puede deshacer una reversión (${id})`,
  noEffect: 'El movimiento no tiene efecto neto sobre el stock',
} as const;

export interface MovementError {
  objectType: 'cell' | 'lot';
  objectId: string;
  message: string;
  details?: Record<string, unknown>;
}

export type MovementResult =
  | { success: true; movementId: string; sequentialNumber: number }
  | { success: false; errors: MovementError[] };

type MovementType = 'assign' | 'move' | 'out' | 'revert';
type MovementReason = 'reception' | 'material_out' | 'delivery' | 'transfer';

interface CellRow {
  id: string;
  capacity: string;
  isActive: boolean;
}

interface EngineOptions {
  note?: string;
  reference?: string;
  revertsId?: string;
}

function err(
  objectType: 'cell' | 'lot',
  objectId: string,
  message: string,
  details?: Record<string, unknown>,
): MovementError {
  if (details !== undefined) {
    return { objectType, objectId, message, details };
  }
  return { objectType, objectId, message };
}

function errResult(message: string): MovementResult {
  return { success: false, errors: [err('cell', '', message)] };
}

async function validateCells(
  tx: DbTx,
  cellIds: string[],
): Promise<{ cells: Map<string, CellRow>; errors: MovementError[] }> {
  const rows: { id: string; capacity: string; isActive: boolean }[] = await tx
    .select({
      id: warehouseCell.id,
      capacity: warehouseCell.capacity,
      isActive: warehouseCell.isActive,
    })
    .from(warehouseCell)
    .where(inArray(warehouseCell.id, cellIds))
    .orderBy(warehouseCell.id);

  const cells = new Map(rows.map((r) => [r.id, r]));
  const errors: MovementError[] = [];

  for (const cellId of cellIds) {
    const cell = cells.get(cellId);
    if (!cell) {
      errors.push(err('cell', cellId, MOVEMENT_ERRORS.cellNotFound(cellId)));
    } else if (!cell.isActive) {
      errors.push(err('cell', cellId, MOVEMENT_ERRORS.cellInactive(cellId)));
    }
  }

  return { cells, errors };
}

async function validateLots(tx: DbTx, lotIds: string[]): Promise<MovementError[]> {
  const rows: { id: string; isActive: boolean }[] = await tx
    .select({ id: lot.id, isActive: lot.isActive })
    .from(lot)
    .where(inArray(lot.id, lotIds));

  const lots = new Map(rows.map((r) => [r.id, r]));
  const errors: MovementError[] = [];

  for (const lotId of lotIds) {
    const lotRow = lots.get(lotId);
    if (!lotRow) {
      errors.push(err('lot', lotId, MOVEMENT_ERRORS.lotNotFound(lotId)));
    } else if (!lotRow.isActive) {
      errors.push(err('lot', lotId, MOVEMENT_ERRORS.lotInactive(lotId)));
    }
  }

  return errors;
}

async function readStock(tx: DbTx, cellIds: string[]): Promise<Map<string, Map<string, number>>> {
  const rows = await tx
    .select({ cellId: cellLot.cellId, lotId: cellLot.lotId, quantity: cellLot.quantity })
    .from(cellLot)
    .where(inArray(cellLot.cellId, cellIds));

  const stock = new Map<string, Map<string, number>>();

  for (const { cellId, lotId, quantity } of rows) {
    const byCell = stock.get(cellId);
    if (byCell) {
      byCell.set(lotId, Number(quantity));
    } else {
      stock.set(cellId, new Map([[lotId, Number(quantity)]]));
    }
  }

  return stock;
}

function cellTotal(stock: Map<string, Map<string, number>>, cellId: string): number {
  let total = 0;
  for (const qty of stock.get(cellId)?.values() ?? []) {
    total += qty;
  }
  return total;
}

function validateSingleCell(
  cellId: string,
  byLot: Map<string, number>,
  stock: Map<string, Map<string, number>>,
  errors: MovementError[],
): number {
  let totalDelta = 0;

  for (const [lotId, delta] of byLot) {
    totalDelta += delta;

    if (delta < 0) {
      const currentQty = stock.get(cellId)?.get(lotId) ?? 0;

      if (currentQty + delta < 0) {
        errors.push(
          err(
            'cell',
            cellId,
            MOVEMENT_ERRORS.insufficientStock(cellId, currentQty, Math.abs(delta)),
            {
              currentQty,
              required: Math.abs(delta),
            },
          ),
        );
      }
    }
  }

  return totalDelta;
}

function validateCellCapacity(
  cellId: string,
  totalDelta: number,
  stock: Map<string, Map<string, number>>,
  cells: Map<string, CellRow>,
  errors: MovementError[],
): void {
  if (totalDelta <= 0) {
    return;
  }

  const cell = cells.get(cellId);
  if (!cell) {
    return;
  }

  const currentTotal = cellTotal(stock, cellId);
  const capacity = Number(cell.capacity);

  if (currentTotal + totalDelta > capacity) {
    errors.push(
      err(
        'cell',
        cellId,
        MOVEMENT_ERRORS.capacityExceeded(cellId, capacity, currentTotal, totalDelta),
        {
          capacity,
          occupied: currentTotal,
          toAdd: totalDelta,
        },
      ),
    );
  }
}

function validateStockDeltas(
  deltas: Map<string, Map<string, number>>,
  stock: Map<string, Map<string, number>>,
  cells: Map<string, CellRow>,
): MovementError[] {
  const errors: MovementError[] = [];

  for (const [cellId, byLot] of deltas) {
    const totalDelta = validateSingleCell(cellId, byLot, stock, errors);
    validateCellCapacity(cellId, totalDelta, stock, cells, errors);
  }

  return errors;
}

async function applyStockDeltas(
  tx: DbTx,
  cellIds: string[],
  deltas: Map<string, Map<string, number>>,
  stock: Map<string, Map<string, number>>,
): Promise<void> {
  for (const [cellId, byLot] of deltas) {
    for (const [lotId, delta] of byLot) {
      const currentQty = stock.get(cellId)?.get(lotId) ?? 0;

      if (currentQty === 0) {
        const newQty = currentQty + delta;
        await tx.insert(cellLot).values({ cellId, lotId, quantity: String(newQty) });
      } else {
        await tx
          .update(cellLot)
          .set({ quantity: sql`${cellLot.quantity} + ${String(delta)}` })
          .where(and(eq(cellLot.cellId, cellId), eq(cellLot.lotId, lotId)));
      }
    }
  }

  await tx.delete(cellLot).where(and(inArray(cellLot.cellId, cellIds), eq(cellLot.quantity, '0')));
}

async function insertMovement(
  tx: DbTx,
  type: MovementType,
  reason: MovementReason | null,
  userId: string,
  entries: Transfer[],
  options?: EngineOptions,
) {
  const [inserted] = await tx
    .insert(movement)
    .values({
      type,
      reason,
      userId,
      note: options?.note ?? null,
      reference: options?.reference ?? null,
      revertsId: options?.revertsId ?? null,
    })
    .returning({ id: movement.id, sequentialNumber: movement.sequentialNumber });

  if (!inserted) {
    return null;
  }

  const entryValues = entries.map((e) => ({
    id: generateId('mve'),
    movementId: inserted.id,
    lotId: e.lotId,
    originCellId: e.originCellId,
    destinationCellId: e.destinationCellId,
    quantity: String(e.quantity),
  }));

  await tx.insert(movementEntry).values(entryValues);

  return { id: inserted.id, sequentialNumber: inserted.sequentialNumber };
}

const MAX_ENTRIES = 500;

function collectAffectedIds(entries: Transfer[]): { cellIds: string[]; lotIds: string[] } {
  const cellIds = [
    ...new Set(
      entries.flatMap((e) => [e.originCellId, e.destinationCellId].filter(Boolean)) as string[],
    ),
  ].sort();
  const lotIds = [...new Set(entries.map((e) => e.lotId))];
  return { cellIds, lotIds };
}

async function recordMovementOnly(
  tx: DbTx,
  userId: string,
  type: MovementType,
  reason: MovementReason | null,
  entries: Transfer[],
  options?: EngineOptions,
): Promise<MovementResult> {
  const inserted = await insertMovement(tx, type, reason, userId, entries, options);

  if (!inserted) {
    return errResult('Error al crear el movimiento');
  }

  return { success: true, movementId: inserted.id, sequentialNumber: inserted.sequentialNumber };
}

async function recordAndApply(
  tx: DbTx,
  userId: string,
  type: MovementType,
  reason: MovementReason | null,
  entries: Transfer[],
  cellIds: string[],
  deltas: Map<string, Map<string, number>>,
  stock: Map<string, Map<string, number>>,
  options?: EngineOptions,
): Promise<MovementResult> {
  const inserted = await insertMovement(tx, type, reason, userId, entries, options);

  if (!inserted) {
    return errResult('Error al crear el movimiento');
  }

  await applyStockDeltas(tx, cellIds, deltas, stock);

  return { success: true, movementId: inserted.id, sequentialNumber: inserted.sequentialNumber };
}

export async function executeMovement(
  tx: DbTx,
  userId: string,
  type: MovementType,
  reason: MovementReason | null,
  entries: Transfer[],
  options?: EngineOptions,
): Promise<MovementResult> {
  if (entries.length === 0 || entries.length > MAX_ENTRIES) {
    return errResult(`El movimiento debe tener entre 1 y ${MAX_ENTRIES} entradas`);
  }

  const deltas = computeNetDeltas(entries);
  const { cellIds, lotIds } = collectAffectedIds(entries);

  if (cellIds.length === 0) {
    return recordMovementOnly(tx, userId, type, reason, entries, options);
  }

  const { cells, errors: cellErrors } = await validateCells(tx, cellIds);

  if (cellErrors.length > 0) {
    return { success: false, errors: cellErrors };
  }

  const lotErrors = await validateLots(tx, lotIds);

  if (lotErrors.length > 0) {
    return { success: false, errors: lotErrors };
  }

  const stock = await readStock(tx, cellIds);
  const validationErrors = validateStockDeltas(deltas, stock, cells);

  if (validationErrors.length > 0) {
    return { success: false, errors: validationErrors };
  }

  return recordAndApply(tx, userId, type, reason, entries, cellIds, deltas, stock, options);
}

export async function revertMovement(
  tx: DbTx,
  userId: string,
  movementId: string,
): Promise<MovementResult> {
  const [original] = await tx
    .select({ id: movement.id, type: movement.type })
    .from(movement)
    .where(eq(movement.id, movementId))
    .for('update');

  if (!original) {
    return errResult(MOVEMENT_ERRORS.movementNotFound(movementId));
  }

  if (original.type === 'revert') {
    return errResult(MOVEMENT_ERRORS.cannotRevertRevert(movementId));
  }

  const [existingRevert] = await tx
    .select({ id: movement.id })
    .from(movement)
    .where(eq(movement.revertsId, movementId))
    .limit(1);

  if (existingRevert) {
    return errResult(MOVEMENT_ERRORS.alreadyReverted(movementId));
  }

  const originalEntries = await tx
    .select({
      lotId: movementEntry.lotId,
      originCellId: movementEntry.originCellId,
      destinationCellId: movementEntry.destinationCellId,
      quantity: movementEntry.quantity,
    })
    .from(movementEntry)
    .where(eq(movementEntry.movementId, movementId));

  const inverseEntries: Transfer[] = originalEntries.map(
    (e: {
      lotId: string;
      originCellId: string | null;
      destinationCellId: string | null;
      quantity: string;
    }) => ({
      lotId: e.lotId,
      originCellId: e.destinationCellId,
      destinationCellId: e.originCellId,
      quantity: Number(e.quantity),
    }),
  );

  return executeMovement(tx, userId, 'revert', null, inverseEntries, { revertsId: movementId });
}
