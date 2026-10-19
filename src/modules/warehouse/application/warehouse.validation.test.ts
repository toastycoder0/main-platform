import { describe, expect, it } from 'vitest';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import { Q_MAX_LENGTH } from '@/shared/list/list-params';
import {
  cellCapacityFormSchema,
  createLotSchema,
  lotFormSchema,
  movementFormSchema,
  movementHistoryFiltersSchema,
  registerMovementSchema,
  revertSchema,
} from './warehouse.validation';

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
    expect(createLotSchema.safeParse({ itemId: 'pitem_1', code: 'LOTE-001' }).success).toBe(true);
  });

  it('rejects missing itemId', () => {
    expect(createLotSchema.safeParse({ code: 'LOTE-001' }).success).toBe(false);
  });

  it('rejects empty code', () => {
    expect(createLotSchema.safeParse({ itemId: 'pitem_1', code: '' }).success).toBe(false);
  });

  it('accepts an explicit inactive lot', () => {
    const result = createLotSchema.safeParse({
      itemId: 'pitem_1',
      code: 'LOTE-001',
      isActive: false,
    });

    expect(result.success).toBe(true);
  });

  it('rejects a non-boolean isActive', () => {
    expect(
      createLotSchema.safeParse({ itemId: 'pitem_1', code: 'LOTE-001', isActive: 'no' }).success,
    ).toBe(false);
  });
});

describe('lotFormSchema', () => {
  it('accepts a valid form payload', () => {
    const result = lotFormSchema.safeParse({
      itemId: 'pitem_1',
      code: 'LOTE-001',
      isActive: true,
    });

    expect(result.success).toBe(true);
  });

  it('requires isActive', () => {
    expect(lotFormSchema.safeParse({ itemId: 'pitem_1', code: 'LOTE-001' }).success).toBe(false);
  });

  it('rejects an empty code', () => {
    expect(
      lotFormSchema.safeParse({ itemId: 'pitem_1', code: '   ', isActive: false }).success,
    ).toBe(false);
  });
});

describe('cellCapacityFormSchema', () => {
  it('maps an empty input to no limit', () => {
    const result = cellCapacityFormSchema.safeParse({ capacity: '   ' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.capacity).toBeNull();
    }
  });

  it('accepts a valid capacity', () => {
    const result = cellCapacityFormSchema.safeParse({ capacity: '100' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.capacity).toBe(100);
    }
  });

  it('matches the server rule rejecting zero', () => {
    expect(cellCapacityFormSchema.safeParse({ capacity: '0' }).success).toBe(false);
  });

  it('rejects negative and non-numeric values', () => {
    expect(cellCapacityFormSchema.safeParse({ capacity: '-5' }).success).toBe(false);
    expect(cellCapacityFormSchema.safeParse({ capacity: 'abc' }).success).toBe(false);
  });
});

describe('text normalization', () => {
  it('trims lot code', () => {
    const result = createLotSchema.safeParse({ itemId: 'pitem_1', code: ' L-1 ' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({ code: 'L-1' });
    }
  });

  it('rejects a blank lot code', () => {
    expect(createLotSchema.safeParse({ itemId: 'pitem_1', code: '   ' }).success).toBe(false);
  });
});

const validFormRow = () => ({
  lotId: 'lot_1',
  originCellId: 'wcel_1',
  destinationCellId: 'wcel_2',
  quantity: '1',
});

describe('movementFormSchema', () => {
  it('accepts a valid reception row', () => {
    const result = movementFormSchema.safeParse({
      kind: 'reception',
      title: 'Recepción',
      rows: [{ ...validFormRow(), originCellId: '' }],
    });

    expect(result.success).toBe(true);
  });

  it('requires the session title', () => {
    const result = movementFormSchema.safeParse({
      kind: 'transfer',
      title: '   ',
      rows: [validFormRow()],
    });

    expect(result.success).toBe(false);
  });

  it('requires an origin for out movements', () => {
    const result = movementFormSchema.safeParse({
      kind: 'materialOut',
      title: 'Salida',
      rows: [{ ...validFormRow(), originCellId: '', destinationCellId: '' }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['rows', 0, 'originCellId']);
    }
  });

  it('requires a destination for reception', () => {
    const result = movementFormSchema.safeParse({
      kind: 'reception',
      title: 'Recepción',
      rows: [{ ...validFormRow(), destinationCellId: '' }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['rows', 0, 'destinationCellId']);
    }
  });

  it('rejects a transfer with the same origin and destination', () => {
    const result = movementFormSchema.safeParse({
      kind: 'transfer',
      title: 'Transferencia',
      rows: [{ ...validFormRow(), destinationCellId: 'wcel_1' }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(FIELD_ERRORS.sameCell);
    }
  });

  it('accepts multiple out rows', () => {
    const result = movementFormSchema.safeParse({
      kind: 'delivery',
      title: 'Entrega',
      rows: [validFormRow(), validFormRow()],
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid quantities', () => {
    for (const quantity of ['', '0', '-1', '0.00001', '1e12']) {
      const result = movementFormSchema.safeParse({
        kind: 'transfer',
        title: 'Transferencia',
        rows: [{ ...validFormRow(), quantity }],
      });

      expect(result.success).toBe(false);
    }
  });

  it('accepts quantities up to four decimals', () => {
    const result = movementFormSchema.safeParse({
      kind: 'transfer',
      title: 'Transferencia',
      rows: [{ ...validFormRow(), quantity: '0.1234' }],
    });

    expect(result.success).toBe(true);
  });

  it('accepts 500 rows and rejects 501', () => {
    const rows = Array.from({ length: 500 }, () => validFormRow());

    expect(movementFormSchema.safeParse({ kind: 'delivery', title: 'Entrega', rows }).success).toBe(
      true,
    );
    expect(
      movementFormSchema.safeParse({
        kind: 'delivery',
        title: 'Entrega',
        rows: [...rows, validFormRow()],
      }).success,
    ).toBe(false);
  });
});

const validReturnContext = {
  view: 'map',
  q: null,
  page: 1,
  pageSize: 10,
  highlight: null,
} as const;

describe('registerMovementSchema', () => {
  it('accepts a valid return context', () => {
    const result = registerMovementSchema.safeParse({
      kind: 'reception',
      title: 'Recepción',
      rows: [{ ...validFormRow(), originCellId: '' }],
      returnContext: validReturnContext,
    });

    expect(result.success).toBe(true);
  });

  it('rejects an unknown view', () => {
    const result = registerMovementSchema.safeParse({
      kind: 'reception',
      title: 'Recepción',
      rows: [{ ...validFormRow(), originCellId: '' }],
      returnContext: { ...validReturnContext, view: 'dashboard' },
    });

    expect(result.success).toBe(false);
  });

  it('rejects a search term that is too long', () => {
    const result = registerMovementSchema.safeParse({
      kind: 'reception',
      title: 'Recepción',
      rows: [{ ...validFormRow(), originCellId: '' }],
      returnContext: { ...validReturnContext, q: 'a'.repeat(Q_MAX_LENGTH + 1) },
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid page', () => {
    const result = registerMovementSchema.safeParse({
      kind: 'reception',
      title: 'Recepción',
      rows: [{ ...validFormRow(), originCellId: '' }],
      returnContext: { ...validReturnContext, page: 0 },
    });

    expect(result.success).toBe(false);
  });

  it('rejects a page size outside PAGE_SIZES', () => {
    const result = registerMovementSchema.safeParse({
      kind: 'reception',
      title: 'Recepción',
      rows: [{ ...validFormRow(), originCellId: '' }],
      returnContext: { ...validReturnContext, pageSize: 15 },
    });

    expect(result.success).toBe(false);
  });

  it('keeps the movement row refinements', () => {
    const result = registerMovementSchema.safeParse({
      kind: 'transfer',
      title: 'Transferencia',
      rows: [{ ...validFormRow(), destinationCellId: 'wcel_1' }],
      returnContext: validReturnContext,
    });

    expect(result.success).toBe(false);
  });
});

describe('movementHistoryFiltersSchema', () => {
  it('accepts multiple movement filters', () => {
    const result = movementHistoryFiltersSchema.safeParse({
      movements: ['reception', 'transfer', 'revert'],
    });

    expect(result.success).toBe(true);
  });

  it('rejects unknown movement values', () => {
    const result = movementHistoryFiltersSchema.safeParse({
      movements: ['unknown'],
    });

    expect(result.success).toBe(false);
  });
});
