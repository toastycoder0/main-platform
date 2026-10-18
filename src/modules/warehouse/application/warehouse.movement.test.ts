import { describe, expect, it } from 'vitest';
import {
  createMovementRow,
  MOVEMENT_FORM_COLUMNS,
  MOVEMENT_KIND_MAP,
  usesDestination,
  usesOrigin,
} from './warehouse.movement';

describe('MOVEMENT_KIND_MAP', () => {
  it('maps form kinds to engine types and reasons', () => {
    expect(MOVEMENT_KIND_MAP).toEqual({
      reception: { type: 'assign', reason: 'reception' },
      transfer: { type: 'move', reason: 'transfer' },
      materialOut: { type: 'out', reason: 'material_out' },
      delivery: { type: 'out', reason: 'delivery' },
    });
  });
});

describe('MOVEMENT_FORM_COLUMNS', () => {
  it('defines the columns each movement kind needs', () => {
    expect(MOVEMENT_FORM_COLUMNS.reception).toEqual(['lot', 'destinationCell', 'quantity']);
    expect(MOVEMENT_FORM_COLUMNS.transfer).toEqual([
      'lot',
      'originCell',
      'destinationCell',
      'quantity',
    ]);
    expect(MOVEMENT_FORM_COLUMNS.materialOut).toEqual(['lot', 'originCell', 'quantity']);
    expect(MOVEMENT_FORM_COLUMNS.delivery).toEqual(['lot', 'originCell', 'quantity']);
  });
});

describe('usesOrigin / usesDestination', () => {
  it('only reception uses a destination without an origin', () => {
    expect(usesOrigin('reception')).toBe(false);
    expect(usesDestination('reception')).toBe(true);
  });

  it('out movements use an origin without a destination', () => {
    expect(usesOrigin('materialOut')).toBe(true);
    expect(usesDestination('materialOut')).toBe(false);
    expect(usesOrigin('delivery')).toBe(true);
    expect(usesDestination('delivery')).toBe(false);
  });

  it('transfer uses both endpoints', () => {
    expect(usesOrigin('transfer')).toBe(true);
    expect(usesDestination('transfer')).toBe(true);
  });
});

describe('createMovementRow', () => {
  it('places a preselected cell in the destination for reception', () => {
    expect(createMovementRow('reception', { lotId: 'lot_1', cellId: 'wcel_1' })).toEqual({
      lotId: 'lot_1',
      originCellId: '',
      destinationCellId: 'wcel_1',
      quantity: '',
    });
  });

  it('places a preselected cell in the origin for transfer', () => {
    expect(createMovementRow('transfer', { lotId: 'lot_1', cellId: 'wcel_1' })).toEqual({
      lotId: 'lot_1',
      originCellId: 'wcel_1',
      destinationCellId: '',
      quantity: '',
    });
  });

  it('places a preselected cell in the origin for out movements', () => {
    expect(createMovementRow('materialOut', { lotId: 'lot_1', cellId: 'wcel_1' })).toEqual({
      lotId: 'lot_1',
      originCellId: 'wcel_1',
      destinationCellId: '',
      quantity: '',
    });
    expect(createMovementRow('delivery', { lotId: 'lot_1', cellId: 'wcel_1' })).toEqual({
      lotId: 'lot_1',
      originCellId: 'wcel_1',
      destinationCellId: '',
      quantity: '',
    });
  });

  it('creates an empty row when there is no prefill', () => {
    expect(createMovementRow('transfer')).toEqual({
      lotId: '',
      originCellId: '',
      destinationCellId: '',
      quantity: '',
    });
  });
});
