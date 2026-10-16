export interface Transfer {
  lotId: string;
  originCellId: string | null;
  destinationCellId: string | null;
  quantity: number;
}

function addDelta(
  deltas: Map<string, Map<string, number>>,
  cellId: string,
  lotId: string,
  delta: number,
): void {
  const byLot = deltas.get(cellId);
  if (byLot) {
    byLot.set(lotId, (byLot.get(lotId) ?? 0) + delta);
  } else {
    deltas.set(cellId, new Map([[lotId, delta]]));
  }
}

function removeZeroDeltas(deltas: Map<string, Map<string, number>>): void {
  for (const [cellId, byLot] of deltas) {
    for (const [lotId, delta] of byLot) {
      if (delta === 0) {
        byLot.delete(lotId);
      }
    }
    if (byLot.size === 0) {
      deltas.delete(cellId);
    }
  }
}

export function computeNetDeltas(entries: Transfer[]): Map<string, Map<string, number>> {
  const deltas = new Map<string, Map<string, number>>();

  for (const { lotId, originCellId, destinationCellId, quantity } of entries) {
    if (originCellId) {
      addDelta(deltas, originCellId, lotId, -quantity);
    }
    if (destinationCellId) {
      addDelta(deltas, destinationCellId, lotId, quantity);
    }
  }

  removeZeroDeltas(deltas);
  return deltas;
}
