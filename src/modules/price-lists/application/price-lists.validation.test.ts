import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import {
  createPriceListSchema,
  priceListFormSchema,
  priceListParamsSchema,
  updatePriceListSchema,
} from './price-lists.validation';

describe('updatePriceListSchema', () => {
  it('successfully validates a valid price list update', () => {
    const result = updatePriceListSchema.safeParse({
      id: 'plst_1',
      name: 'Lista A',
      description: 'Precio de mayoreo',
      isDefault: true,
    });
    expect(result.success).toBe(true);
  });

  it('allows a missing or null description', () => {
    expect(updatePriceListSchema.safeParse({ id: 'plst_1', name: 'Lista A' }).success).toBe(true);
    expect(
      updatePriceListSchema.safeParse({ id: 'plst_1', name: 'Lista A', description: null }).success,
    ).toBe(true);
  });

  it('allows isDefault to be absent', () => {
    const result = updatePriceListSchema.safeParse({ id: 'plst_1', name: 'Lista A' });
    expect(result.success).toBe(true);
  });

  it('fails validation when id is empty', () => {
    const result = updatePriceListSchema.safeParse({ id: '', name: 'Lista A' });
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.id).toContain(FIELD_ERRORS.required);
    }
  });

  it('fails validation when name is empty', () => {
    const result = updatePriceListSchema.safeParse({ id: 'plst_1', name: '   ' });
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.name).toContain(FIELD_ERRORS.name);
    }
  });

  it('fails validation when name is longer than 100 characters', () => {
    const result = updatePriceListSchema.safeParse({ id: 'plst_1', name: 'a'.repeat(101) });
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.name).toContain(FIELD_ERRORS.name);
    }
  });

  it('fails validation when description is longer than 500 characters', () => {
    const result = updatePriceListSchema.safeParse({
      id: 'plst_1',
      name: 'Lista A',
      description: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.description).toContain(FIELD_ERRORS.description);
    }
  });
});

describe('priceListParamsSchema', () => {
  it('successfully validates a route id', () => {
    const result = priceListParamsSchema.safeParse({ id: 'plst_1' });
    expect(result.success).toBe(true);
  });

  it('fails validation when the route id is empty', () => {
    const result = priceListParamsSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });
});

describe('createPriceListSchema', () => {
  it('successfully validates a price list without an id', () => {
    const result = createPriceListSchema.safeParse({
      name: 'Lista A',
      description: null,
      isDefault: true,
    });
    expect(result.success).toBe(true);
  });

  it('ignores an unexpected id field', () => {
    const result = createPriceListSchema.safeParse({
      id: 'plst_1',
      name: 'Lista A',
    });
    expect(result.success).toBe(true);

    if (result.success) {
      expect('id' in result.data).toBe(false);
    }
  });

  it('fails validation when name is empty', () => {
    const result = createPriceListSchema.safeParse({ name: '   ' });
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.name).toContain(FIELD_ERRORS.name);
    }
  });
});

describe('priceListFormSchema', () => {
  it('allows a missing id for create mode', () => {
    const result = priceListFormSchema.safeParse({
      name: 'Lista A',
    });
    expect(result.success).toBe(true);
  });

  it('keeps the id when provided for edit mode', () => {
    const result = priceListFormSchema.safeParse({
      id: 'plst_1',
      name: 'Lista A',
    });
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.id).toBe('plst_1');
    }
  });

  it('fails validation when an id is present but empty', () => {
    const result = priceListFormSchema.safeParse({
      id: '',
      name: 'Lista A',
    });
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.id).toContain(FIELD_ERRORS.required);
    }
  });
});
