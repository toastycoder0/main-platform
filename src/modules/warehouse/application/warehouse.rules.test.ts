import { describe, expect, it } from 'vitest';
import { computeNetDeltas, type Transfer } from './warehouse.deltas';
import {
  type CellState,
  checkReferences,
  checkStock,
  type LotState,
  type QuantitiesByCell,
  type StockContext,
} from './warehouse.rules';

const cell = (code: string, capacity: number, isActive = true): CellState => ({
  code,
  capacity,
  isActive,
});
const lot = (code: string, isActive = true): LotState => ({ code, isActive });

function stockOf(entries: Record<string, Record<string, number>>): QuantitiesByCell {
  return new Map(
    Object.entries(entries).map(([cellId, byLot]) => [cellId, new Map(Object.entries(byLot))]),
  );
}

function contextWith(stock: QuantitiesByCell): StockContext {
  return {
    cells: new Map([
      ['A', cell('A1', 100)],
      ['B', cell('B1', 100)],
      ['C', cell('C1', 100)],
    ]),
    lots: new Map([
      ['lot1', lot('L1')],
      ['lot2', lot('L2')],
    ]),
    stock,
  };
}

const transfer = (
  lotId: string,
  originCellId: string | null,
  destinationCellId: string | null,
  quantity: number,
): Transfer => ({ lotId, originCellId, destinationCellId, quantity });

describe('checkReferences', () => {
  const context = {
    cells: new Map([
      ['A', cell('A1', 10)],
      ['OFF', cell('Z9', 10, false)],
    ]),
    lots: new Map([
      ['lot1', lot('L1')],
      ['dead', lot('L0', false)],
    ]),
  };

  it('accepts active cells and lots', () => {
    expect(checkReferences(['A'], ['lot1'], context)).toEqual([]);
  });

  it('rejects unknown and inactive cells and lots, all at once', () => {
    const errors = checkReferences(['A', 'OFF', 'ghost'], ['dead', 'lot1', 'phantom'], context);

    expect(errors.map((error) => [error.objectType, error.objectId])).toEqual([
      ['cell', 'OFF'],
      ['cell', 'ghost'],
      ['lot', 'dead'],
      ['lot', 'phantom'],
    ]);
  });
});

describe('checkStock', () => {
  it('accepts a chain through an empty intermediate cell (A→B and B→C)', () => {
    const deltas = computeNetDeltas([
      transfer('lot1', 'A', 'B', 60),
      transfer('lot1', 'B', 'C', 60),
    ]);

    expect(checkStock(deltas, contextWith(stockOf({ A: { lot1: 60 } })))).toEqual([]);
  });

  it('rejects two entries from the same cell and lot that jointly exceed the stock', () => {
    const deltas = computeNetDeltas([
      transfer('lot1', 'A', 'B', 60),
      transfer('lot1', 'A', 'C', 30),
    ]);

    const errors = checkStock(deltas, contextWith(stockOf({ A: { lot1: 60 } })));

    expect(errors).toHaveLength(1);
    expect(errors[0]?.details).toEqual({ available: 60, required: 90 });
  });

  it('rejects taking a lot that is not in the cell', () => {
    const deltas = computeNetDeltas([transfer('lot2', 'A', null, 1)]);

    expect(checkStock(deltas, contextWith(stockOf({ A: { lot1: 60 } })))).toHaveLength(1);
  });

  it('counts every lot of the cell against its capacity', () => {
    const deltas = computeNetDeltas([transfer('lot1', null, 'A', 60)]);

    const errors = checkStock(deltas, contextWith(stockOf({ A: { lot2: 50 } })));

    expect(errors).toHaveLength(1);
    expect(errors[0]?.details).toEqual({ capacity: 100, occupied: 50, toAdd: 60 });
  });

  it('counts a lot that already sits in the destination cell', () => {
    const deltas = computeNetDeltas([transfer('lot1', 'B', 'A', 30)]);

    const errors = checkStock(deltas, contextWith(stockOf({ A: { lot1: 80 }, B: { lot1: 30 } })));

    expect(errors).toHaveLength(1);
  });

  it('accumulates several entries into the same destination before comparing', () => {
    const deltas = computeNetDeltas([
      transfer('lot1', null, 'A', 60),
      transfer('lot2', null, 'A', 60),
    ]);

    expect(checkStock(deltas, contextWith(stockOf({})))).toHaveLength(1);
  });

  it('subtracts what leaves the cell in the same movement', () => {
    const deltas = computeNetDeltas([
      transfer('lot1', 'A', 'B', 80),
      transfer('lot2', null, 'A', 80),
    ]);

    expect(checkStock(deltas, contextWith(stockOf({ A: { lot1: 80 } })))).toEqual([]);
  });

  it('still lets a cell that is over capacity shrink', () => {
    const context = contextWith(stockOf({ A: { lot1: 150 } }));
    const deltas = computeNetDeltas([transfer('lot1', 'A', 'B', 20)]);

    expect(checkStock(deltas, context)).toEqual([]);
  });

  it('reports insufficient stock and capacity problems together', () => {
    const deltas = computeNetDeltas([
      transfer('lot1', 'A', 'B', 10),
      transfer('lot2', null, 'C', 500),
    ]);

    expect(checkStock(deltas, contextWith(stockOf({})))).toHaveLength(2);
  });
});
