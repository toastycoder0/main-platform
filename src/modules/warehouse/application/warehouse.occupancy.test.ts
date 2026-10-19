import { describe, expect, it } from 'vitest';
import { computeCellOccupancy, occupancyFill, occupancyLabel } from './warehouse.occupancy';

describe('computeCellOccupancy', () => {
  it('computes the percentage for a cell with capacity', () => {
    expect(computeCellOccupancy(50, 100)).toEqual({
      total: 50,
      capacity: 100,
      percentage: 50,
      isOverCapacity: false,
    });
  });

  it('reports overcapacity without capping the percentage', () => {
    expect(computeCellOccupancy(150, 100)).toEqual({
      total: 150,
      capacity: 100,
      percentage: 150,
      isOverCapacity: true,
    });
  });

  it('returns a null percentage when there is no capacity', () => {
    expect(computeCellOccupancy(20, null).percentage).toBeNull();
    expect(computeCellOccupancy(20, undefined).percentage).toBeNull();
    expect(computeCellOccupancy(20, 0).percentage).toBeNull();
  });
});

describe('occupancyFill', () => {
  it('caps the bar at 100', () => {
    expect(occupancyFill(computeCellOccupancy(50, 100))).toBe(50);
    expect(occupancyFill(computeCellOccupancy(150, 100))).toBe(100);
  });

  it('returns 0 when there is no capacity', () => {
    expect(occupancyFill(computeCellOccupancy(20, null))).toBe(0);
    expect(occupancyFill(undefined)).toBe(0);
  });
});

describe('occupancyLabel', () => {
  it('returns the rounded percentage', () => {
    expect(occupancyLabel(computeCellOccupancy(1, 3))).toBe('33%');
    expect(occupancyLabel(computeCellOccupancy(150, 100))).toBe('150%');
  });

  it('returns null when there is no capacity', () => {
    expect(occupancyLabel(computeCellOccupancy(20, null))).toBeNull();
    expect(occupancyLabel(undefined)).toBeNull();
  });
});
