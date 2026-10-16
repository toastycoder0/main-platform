import { describe, expect, it } from 'vitest';
import { computeNetDeltas, type Transfer } from './warehouse.deltas';

function entry(
  lotId: string,
  originCellId: string | null,
  destinationCellId: string | null,
  quantity: number,
): Transfer {
  return { lotId, originCellId, destinationCellId, quantity };
}

describe('computeNetDeltas', () => {
  it('aggregates an assign (exterior → cell)', () => {
    const result = computeNetDeltas([entry('lot1', null, 'cellA', 60)]);

    expect(result.get('cellA')?.get('lot1')).toBe(60);
  });

  it('aggregates an out (cell → exterior)', () => {
    const result = computeNetDeltas([entry('lot1', 'cellA', null, 60)]);

    expect(result.get('cellA')?.get('lot1')).toBe(-60);
  });

  it('aggregates a move (cell → cell)', () => {
    const result = computeNetDeltas([entry('lot1', 'cellA', 'cellB', 60)]);

    expect(result.get('cellA')?.get('lot1')).toBe(-60);
    expect(result.get('cellB')?.get('lot1')).toBe(60);
  });

  it('handles opposite transfers that cancel out', () => {
    const result = computeNetDeltas([
      entry('lot1', 'cellA', 'cellB', 60),
      entry('lot1', 'cellB', 'cellA', 60),
    ]);

    expect(result.get('cellA')).toBeUndefined();
    expect(result.get('cellB')).toBeUndefined();
  });

  it('handles move through intermediate cell at zero', () => {
    const result = computeNetDeltas([
      entry('lot1', 'cellA', 'cellB', 60),
      entry('lot1', 'cellB', 'cellC', 60),
    ]);

    expect(result.get('cellA')?.get('lot1')).toBe(-60);
    expect(result.get('cellB')).toBeUndefined();
    expect(result.get('cellC')?.get('lot1')).toBe(60);
  });

  it('omits pairs where net is zero', () => {
    const result = computeNetDeltas([entry('lot1', 'cellA', 'cellA', 60)]);

    expect(result.get('cellA')).toBeUndefined();
  });

  it('aggregates multiple entries to same cell and lot', () => {
    const result = computeNetDeltas([
      entry('lot1', null, 'cellA', 20),
      entry('lot1', null, 'cellA', 40),
    ]);

    expect(result.get('cellA')?.get('lot1')).toBe(60);
  });

  it('handles multiple lots in same movement', () => {
    const result = computeNetDeltas([
      entry('lot1', null, 'cellA', 60),
      entry('lot2', null, 'cellA', 30),
    ]);

    expect(result.get('cellA')?.get('lot1')).toBe(60);
    expect(result.get('cellA')?.get('lot2')).toBe(30);
  });

  it('handles empty entries', () => {
    const result = computeNetDeltas([]);

    expect(result.size).toBe(0);
  });
});
