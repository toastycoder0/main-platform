import { and, eq, inArray, sql } from 'drizzle-orm';
import type { DbLike } from '@/infrastructure/db';
import { generateId } from '@/infrastructure/db/id';
import { cellLot, lot, movement, movementEntry, warehouseCell } from '@/infrastructure/db/schema';
import { AppError } from '@/shared/errors';
import { computeNetDeltas, type Transfer } from '../application/warehouse.deltas';
import { MovementRejectedError } from '../application/warehouse.errors';
import {
  type CellState,
  checkReferences,
  checkStock,
  type LotState,
  MOVEMENT_ERRORS,
  type QuantitiesByCell,
} from '../application/warehouse.rules';
import type { MovementReceipt, MovementRequest } from '../application/warehouse.types';
import {
  MAX_MOVEMENT_ENTRIES,
  type MovementReason,
  type MovementType,
  QUANTITY_SCALE,
} from '../application/warehouse.validation';

/*
 * The only writer of stock. It never opens a transaction: callers pass their
 * own `tx` so a movement can be combined with other steps atomically, and any
 * rejection is thrown so that transaction rolls back.
 */

interface LedgerHeader {
  userId: string;
  type: MovementType;
  reason: MovementReason | null;
  note: string | null;
  reference: string | null;
  revertsId: string | null;
}

function toScale(value: number): string {
  return value.toFixed(QUANTITY_SCALE);
}

function affectedIds(entries: Transfer[]): { cellIds: string[]; lotIds: string[] } {
  const cellIds = new Set<string>();
  for (const { originCellId, destinationCellId } of entries) {
    if (originCellId) {
      cellIds.add(originCellId);
    }
    if (destinationCellId) {
      cellIds.add(destinationCellId);
    }
  }

  // Ascending order keeps lock acquisition identical across transactions.
  return {
    cellIds: [...cellIds].sort(),
    lotIds: [...new Set(entries.map((entry) => entry.lotId))],
  };
}

// Locking the cells (not the balance rows) serializes every writer of a cell,
// including those about to create a balance row that does not exist yet.
async function lockCells(tx: DbLike, cellIds: string[]): Promise<Map<string, CellState>> {
  const rows = await tx
    .select({
      id: warehouseCell.id,
      code: warehouseCell.code,
      capacity: warehouseCell.capacity,
      isActive: warehouseCell.isActive,
    })
    .from(warehouseCell)
    .where(inArray(warehouseCell.id, cellIds))
    .orderBy(warehouseCell.id)
    .for('update');

  return new Map(
    rows.map((row): [string, CellState] => [
      row.id,
      { code: row.code, capacity: Number(row.capacity), isActive: row.isActive },
    ]),
  );
}

async function readLots(tx: DbLike, lotIds: string[]): Promise<Map<string, LotState>> {
  const rows = await tx
    .select({ id: lot.id, code: lot.code, isActive: lot.isActive })
    .from(lot)
    .where(inArray(lot.id, lotIds));

  return new Map(
    rows.map((row): [string, LotState] => [row.id, { code: row.code, isActive: row.isActive }]),
  );
}

// Must run after the cells are locked so it sees whatever the previous lock
// holder committed.
async function readStock(tx: DbLike, cellIds: string[]): Promise<QuantitiesByCell> {
  const rows = await tx
    .select({ cellId: cellLot.cellId, lotId: cellLot.lotId, quantity: cellLot.quantity })
    .from(cellLot)
    .where(inArray(cellLot.cellId, cellIds));

  const stock = new Map<string, Map<string, number>>();
  for (const { cellId, lotId, quantity } of rows) {
    const byLot = stock.get(cellId) ?? new Map<string, number>();
    byLot.set(lotId, Number(quantity));
    stock.set(cellId, byLot);
  }
  return stock;
}

async function insertLedger(
  tx: DbLike,
  header: LedgerHeader,
  entries: Transfer[],
): Promise<MovementReceipt> {
  const [inserted] = await tx
    .insert(movement)
    .values(header)
    .returning({ id: movement.id, sequentialNumber: movement.sequentialNumber });

  if (!inserted) {
    throw new AppError('internal', 'No se pudo registrar el movimiento');
  }

  await tx.insert(movementEntry).values(
    entries.map((entry) => ({
      id: generateId('mve'),
      movementId: inserted.id,
      lotId: entry.lotId,
      originCellId: entry.originCellId,
      destinationCellId: entry.destinationCellId,
      quantity: toScale(entry.quantity),
    })),
  );

  return { movementId: inserted.id, sequentialNumber: inserted.sequentialNumber };
}

// Balances change by an increment computed inside the database, never by
// writing back a value calculated here. A new row is only ever created with a
// positive amount.
async function applyDelta(tx: DbLike, cellId: string, lotId: string, delta: number): Promise<void> {
  const amount = toScale(Math.abs(delta));

  if (delta > 0) {
    await tx
      .insert(cellLot)
      .values({ cellId, lotId, quantity: amount })
      .onConflictDoUpdate({
        target: [cellLot.cellId, cellLot.lotId],
        set: { quantity: sql`${cellLot.quantity} + ${amount}`, updatedAt: new Date() },
      });
    return;
  }

  await tx
    .update(cellLot)
    .set({ quantity: sql`${cellLot.quantity} - ${amount}` })
    .where(and(eq(cellLot.cellId, cellId), eq(cellLot.lotId, lotId)));
}

async function applyDeltas(tx: DbLike, deltas: QuantitiesByCell): Promise<void> {
  if (deltas.size === 0) {
    return;
  }

  for (const [cellId, byLot] of deltas) {
    for (const [lotId, delta] of byLot) {
      await applyDelta(tx, cellId, lotId, delta);
    }
  }

  // A balance row only exists while it holds material.
  await tx
    .delete(cellLot)
    .where(and(inArray(cellLot.cellId, [...deltas.keys()]), eq(cellLot.quantity, '0')));
}

async function applyMovement(
  tx: DbLike,
  header: LedgerHeader,
  entries: Transfer[],
): Promise<MovementReceipt> {
  if (entries.length === 0 || entries.length > MAX_MOVEMENT_ENTRIES) {
    throw new AppError('invalid_input', MOVEMENT_ERRORS.entryCount(MAX_MOVEMENT_ENTRIES));
  }

  const { cellIds, lotIds } = affectedIds(entries);
  const cells = await lockCells(tx, cellIds);
  const lots = await readLots(tx, lotIds);

  const referenceErrors = checkReferences(cellIds, lotIds, { cells, lots });
  if (referenceErrors.length > 0) {
    throw new MovementRejectedError(referenceErrors);
  }

  const deltas = computeNetDeltas(entries);
  const stock = await readStock(tx, cellIds);
  const stockErrors = checkStock(deltas, { cells, lots, stock });
  if (stockErrors.length > 0) {
    throw new MovementRejectedError(stockErrors);
  }

  const receipt = await insertLedger(tx, header, entries);
  await applyDeltas(tx, deltas);
  return receipt;
}

export function executeMovement(tx: DbLike, request: MovementRequest): Promise<MovementReceipt> {
  const { userId, kind, entries, note, reference } = request;

  return applyMovement(
    tx,
    {
      userId,
      type: kind.type,
      reason: kind.reason,
      note: note ?? null,
      reference: reference ?? null,
      revertsId: null,
    },
    entries,
  );
}

function rejectMovement(movementId: string, message: string): MovementRejectedError {
  return new MovementRejectedError([{ objectType: 'movement', objectId: movementId, message }]);
}

// Undoing is just another movement: the inverse entries go through the same
// validations, so it fails if the material is no longer where it was put.
export async function revertMovement(
  tx: DbLike,
  userId: string,
  movementId: string,
): Promise<MovementReceipt> {
  const [original] = await tx
    .select({ type: movement.type })
    .from(movement)
    .where(eq(movement.id, movementId))
    .for('update');

  if (!original) {
    throw rejectMovement(movementId, MOVEMENT_ERRORS.movementNotFound(movementId));
  }

  if (original.type === 'revert') {
    throw rejectMovement(movementId, MOVEMENT_ERRORS.cannotRevertRevert(movementId));
  }

  const [existingRevert] = await tx
    .select({ id: movement.id })
    .from(movement)
    .where(eq(movement.revertsId, movementId))
    .limit(1);

  if (existingRevert) {
    throw rejectMovement(movementId, MOVEMENT_ERRORS.alreadyReverted(movementId));
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

  const inverse = originalEntries.map(
    (entry): Transfer => ({
      lotId: entry.lotId,
      originCellId: entry.destinationCellId,
      destinationCellId: entry.originCellId,
      quantity: Number(entry.quantity),
    }),
  );

  return applyMovement(
    tx,
    { userId, type: 'revert', reason: null, note: null, reference: null, revertsId: movementId },
    inverse,
  );
}
