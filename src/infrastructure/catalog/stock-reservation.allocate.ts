export interface ReservableSlot {
  lotId: string;
  cellId: string;
  lotCode: string;
  available: number;
}

export interface ReservationAllocation {
  lotId: string;
  cellId: string;
  quantity: number;
}

/**
 * Splits `quantity` over the slots in lot-code then cell order, the same order
 * the catalog lists lots. Returns null when the slots cannot cover it.
 */
export function allocateReservation(
  slots: readonly ReservableSlot[],
  quantity: number,
): ReservationAllocation[] | null {
  const ordered = [...slots]
    .filter((slot) => slot.available > 0)
    .sort(
      (a, b) =>
        a.lotCode.localeCompare(b.lotCode) ||
        a.lotId.localeCompare(b.lotId) ||
        a.cellId.localeCompare(b.cellId),
    );

  const allocations: ReservationAllocation[] = [];
  let remaining = quantity;

  for (const slot of ordered) {
    if (remaining <= 0) {
      break;
    }

    const taken = Math.min(slot.available, remaining);
    allocations.push({ lotId: slot.lotId, cellId: slot.cellId, quantity: taken });
    remaining -= taken;
  }

  return remaining > 0 ? null : allocations;
}
