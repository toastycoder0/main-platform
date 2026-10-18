import type { MovementErrorDTO } from './warehouse.types';

export const MOVEMENT_ERRORS = {
  cellNotFound: (id: string) => `La celda ${id} no existe`,
  cellInactive: (code: string) => `La celda ${code} está inactiva`,
  lotNotFound: (id: string) => `El lote ${id} no existe`,
  lotInactive: (code: string) => `El lote ${code} está inactivo`,
  insufficientStock: (cell: string, lot: string, available: number, required: number) =>
    `Stock insuficiente del lote ${lot} en la celda ${cell}. Disponible: ${available}, requerido: ${required}`,
  capacityExceeded: (cell: string, capacity: number, occupied: number, adding: number) =>
    `Capacidad insuficiente en la celda ${cell}. Capacidad: ${capacity}, ocupado: ${occupied}, a agregar: ${adding}`,
  movementNotFound: (id: string) => `El movimiento ${id} no existe`,
  alreadyReverted: (id: string) => `El movimiento ${id} ya fue deshecho`,
  cannotRevertRevert: (id: string) => `No se puede deshacer una reversión (${id})`,
  entryCount: (max: number) => `El movimiento debe tener entre 1 y ${max} entradas`,
} as const;

export interface CellState {
  code: string;
  // `null` means the cell has no capacity limit (matches the nullable DB column).
  capacity: number | null;
  isActive: boolean;
}

export interface LotState {
  code: string;
  isActive: boolean;
}

export type QuantitiesByCell = ReadonlyMap<string, ReadonlyMap<string, number>>;

export interface StockContext {
  cells: ReadonlyMap<string, CellState>;
  lots: ReadonlyMap<string, LotState>;
  stock: QuantitiesByCell;
}

function cellProblems(id: string, cell: CellState | undefined): MovementErrorDTO[] {
  if (!cell) {
    return [{ objectType: 'cell', objectId: id, message: MOVEMENT_ERRORS.cellNotFound(id) }];
  }
  if (!cell.isActive) {
    return [{ objectType: 'cell', objectId: id, message: MOVEMENT_ERRORS.cellInactive(cell.code) }];
  }
  return [];
}

function lotProblems(id: string, lot: LotState | undefined): MovementErrorDTO[] {
  if (!lot) {
    return [{ objectType: 'lot', objectId: id, message: MOVEMENT_ERRORS.lotNotFound(id) }];
  }
  if (!lot.isActive) {
    return [{ objectType: 'lot', objectId: id, message: MOVEMENT_ERRORS.lotInactive(lot.code) }];
  }
  return [];
}

export function checkReferences(
  cellIds: readonly string[],
  lotIds: readonly string[],
  context: Pick<StockContext, 'cells' | 'lots'>,
): MovementErrorDTO[] {
  return [
    ...cellIds.flatMap((id) => cellProblems(id, context.cells.get(id))),
    ...lotIds.flatMap((id) => lotProblems(id, context.lots.get(id))),
  ];
}

function insufficientStock(
  cellId: string,
  deltas: ReadonlyMap<string, number>,
  context: StockContext,
): MovementErrorDTO[] {
  const cellCode = context.cells.get(cellId)?.code ?? cellId;
  const errors: MovementErrorDTO[] = [];

  for (const [lotId, delta] of deltas) {
    const available = context.stock.get(cellId)?.get(lotId) ?? 0;
    if (delta < 0 && available + delta < 0) {
      const lotCode = context.lots.get(lotId)?.code ?? lotId;
      errors.push({
        objectType: 'cell',
        objectId: cellId,
        message: MOVEMENT_ERRORS.insufficientStock(cellCode, lotCode, available, -delta),
        details: { available, required: -delta },
      });
    }
  }

  return errors;
}

function occupancyOf(stock: QuantitiesByCell, cellId: string): number {
  let total = 0;
  for (const quantity of stock.get(cellId)?.values() ?? []) {
    total += quantity;
  }
  return total;
}

function capacityExceeded(
  cellId: string,
  deltas: ReadonlyMap<string, number>,
  context: StockContext,
): MovementErrorDTO[] {
  const cell = context.cells.get(cellId);
  let netGain = 0;
  for (const delta of deltas.values()) {
    netGain += delta;
  }

  // A cell without a capacity limit never rejects inbound stock.
  if (!cell || cell.capacity === null || netGain <= 0) {
    return [];
  }

  const occupied = occupancyOf(context.stock, cellId);
  if (occupied + netGain <= cell.capacity) {
    return [];
  }

  return [
    {
      objectType: 'cell',
      objectId: cellId,
      message: MOVEMENT_ERRORS.capacityExceeded(cell.code, cell.capacity, occupied, netGain),
      details: { capacity: cell.capacity, occupied, toAdd: netGain },
    },
  ];
}

export function checkStock(deltas: QuantitiesByCell, context: StockContext): MovementErrorDTO[] {
  return [...deltas].flatMap(([cellId, byLot]) => [
    ...insufficientStock(cellId, byLot, context),
    ...capacityExceeded(cellId, byLot, context),
  ]);
}
