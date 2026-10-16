import { describe, expect, it } from 'vitest';
import {
  assignSchema,
  bulkCreateCellSchema,
  createCellSchema,
  createLotSchema,
  createNodeSchema,
  moveSchema,
  outSchema,
  revertSchema,
} from './warehouse.validation';

const validAssignEntry = () => ({ lotId: 'lot_1', destinationCellId: 'wcel_1', quantity: 60 });

const validMoveEntry = () => ({
  lotId: 'lot_1',
  originCellId: 'wcel_1',
  destinationCellId: 'wcel_2',
  quantity: 60,
});

const validOutEntry = () => ({ lotId: 'lot_1', originCellId: 'wcel_1', quantity: 60 });

describe('assignSchema', () => {
  it('accepts valid assign with one entry', () => {
    expect(assignSchema.safeParse({ entries: [validAssignEntry()] }).success).toBe(true);
  });

  it('rejects entry with quantity = 0', () => {
    const result = assignSchema.safeParse({ entries: [{ ...validAssignEntry(), quantity: 0 }] });
    expect(result.success).toBe(false);
  });

  it('rejects entry with negative quantity', () => {
    const result = assignSchema.safeParse({ entries: [{ ...validAssignEntry(), quantity: -1 }] });
    expect(result.success).toBe(false);
  });

  it('rejects entry with missing destinationCellId', () => {
    const result = assignSchema.safeParse({
      entries: [{ lotId: 'lot_1', quantity: 60 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty entries', () => {
    const result = assignSchema.safeParse({ entries: [] });
    expect(result.success).toBe(false);
  });

  it('accepts 500 entries', () => {
    const entries = Array.from({ length: 500 }, () => validAssignEntry());
    expect(assignSchema.safeParse({ entries }).success).toBe(true);
  });

  it('rejects more than 500 entries', () => {
    const entries = Array.from({ length: 501 }, () => validAssignEntry());
    const result = assignSchema.safeParse({ entries });
    expect(result.success).toBe(false);
  });
});

describe('moveSchema', () => {
  it('accepts valid move with one entry', () => {
    expect(moveSchema.safeParse({ entries: [validMoveEntry()] }).success).toBe(true);
  });

  it('rejects entry where origin equals destination', () => {
    const result = moveSchema.safeParse({
      entries: [{ ...validMoveEntry(), destinationCellId: 'wcel_1' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects entry with missing originCellId', () => {
    const result = moveSchema.safeParse({
      entries: [{ lotId: 'lot_1', destinationCellId: 'wcel_2', quantity: 60 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('outSchema', () => {
  it('accepts valid out with one entry', () => {
    expect(outSchema.safeParse({ entries: [validOutEntry()] }).success).toBe(true);
  });

  it('rejects entry with missing originCellId', () => {
    const result = outSchema.safeParse({
      entries: [{ lotId: 'lot_1', quantity: 60 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('revertSchema', () => {
  it('accepts valid revert', () => {
    expect(revertSchema.safeParse({ movementId: 'mov_1' }).success).toBe(true);
  });

  it('rejects empty movementId', () => {
    expect(revertSchema.safeParse({ movementId: '' }).success).toBe(false);
  });
});

describe('createLotSchema', () => {
  it('accepts valid lot', () => {
    expect(
      createLotSchema.safeParse({ itemId: 'pitem_1', code: 'LOTE-001', name: 'Lote 001' }).success,
    ).toBe(true);
  });

  it('rejects missing itemId', () => {
    expect(createLotSchema.safeParse({ code: 'LOTE-001', name: 'Lote 001' }).success).toBe(false);
  });

  it('rejects empty code', () => {
    expect(
      createLotSchema.safeParse({ itemId: 'pitem_1', code: '', name: 'Lote 001' }).success,
    ).toBe(false);
  });
});

describe('createNodeSchema', () => {
  it('accepts valid node', () => {
    expect(
      createNodeSchema.safeParse({
        warehouseId: 'wh_1',
        name: 'Rack A',
        kind: 'rack',
      }).success,
    ).toBe(true);
  });

  it('rejects missing warehouseId', () => {
    expect(createNodeSchema.safeParse({ name: 'Rack A', kind: 'rack' }).success).toBe(false);
  });

  it('rejects empty name', () => {
    expect(
      createNodeSchema.safeParse({ warehouseId: 'wh_1', name: '   ', kind: 'rack' }).success,
    ).toBe(false);
  });
});

describe('createCellSchema', () => {
  it('accepts valid cell', () => {
    expect(
      createCellSchema.safeParse({ nodeId: 'wn_1', code: 'A1', position: 1, capacity: 100 })
        .success,
    ).toBe(true);
  });

  it('rejects negative capacity', () => {
    expect(
      createCellSchema.safeParse({ nodeId: 'wn_1', code: 'A1', position: 1, capacity: -1 }).success,
    ).toBe(false);
  });

  it('rejects non-integer position', () => {
    expect(
      createCellSchema.safeParse({ nodeId: 'wn_1', code: 'A1', position: 1.5, capacity: 100 })
        .success,
    ).toBe(false);
  });
});

describe('bulkCreateCellSchema', () => {
  it('accepts valid bulk range', () => {
    expect(
      bulkCreateCellSchema.safeParse({
        nodeId: 'wn_1',
        prefix: 'A',
        range: { start: 1, end: 10 },
        capacity: 100,
      }).success,
    ).toBe(true);
  });

  it('rejects range where start > end', () => {
    expect(
      bulkCreateCellSchema.safeParse({
        nodeId: 'wn_1',
        prefix: 'A',
        range: { start: 10, end: 1 },
        capacity: 100,
      }).success,
    ).toBe(false);
  });

  it('rejects non-integer position in range', () => {
    expect(
      bulkCreateCellSchema.safeParse({
        nodeId: 'wn_1',
        prefix: 'A',
        range: { start: 1.5, end: 10 },
        capacity: 100,
      }).success,
    ).toBe(false);
  });
});
