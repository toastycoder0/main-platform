import { describe, expect, it } from 'vitest';
import { allocateReservation } from './stock-reservation.allocate';

describe('allocateReservation', () => {
  it('takes from a single slot when it covers the quantity', () => {
    expect(
      allocateReservation([{ lotId: 'l1', cellId: 'c1', lotCode: 'A', available: 10 }], 4),
    ).toEqual([{ lotId: 'l1', cellId: 'c1', quantity: 4 }]);
  });

  it('spreads over slots in lot code order', () => {
    const slots = [
      { lotId: 'l2', cellId: 'c1', lotCode: 'B', available: 5 },
      { lotId: 'l1', cellId: 'c2', lotCode: 'A', available: 3 },
    ];

    expect(allocateReservation(slots, 6)).toEqual([
      { lotId: 'l1', cellId: 'c2', quantity: 3 },
      { lotId: 'l2', cellId: 'c1', quantity: 3 },
    ]);
  });

  it('skips empty slots', () => {
    const slots = [
      { lotId: 'l1', cellId: 'c1', lotCode: 'A', available: 0 },
      { lotId: 'l2', cellId: 'c1', lotCode: 'B', available: 2 },
    ];

    expect(allocateReservation(slots, 2)).toEqual([{ lotId: 'l2', cellId: 'c1', quantity: 2 }]);
  });

  it('returns null when stock is insufficient', () => {
    expect(
      allocateReservation([{ lotId: 'l1', cellId: 'c1', lotCode: 'A', available: 1 }], 2),
    ).toBeNull();
  });
});
