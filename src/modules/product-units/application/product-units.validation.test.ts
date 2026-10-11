import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import {
  createProductUnitSchema,
  productUnitParamsSchema,
  updateProductUnitSchema,
} from './product-units.validation';

describe('updateProductUnitSchema', () => {
  it('successfully validates a valid unit update', () => {
    expect(
      updateProductUnitSchema.safeParse({
        id: 'unit_1',
        name: 'Metro cuadrado',
        abbreviation: 'm2',
        taxCode: 'MTR',
        isActive: true,
      }).success,
    ).toBe(true);
  });

  it('allows empty abbreviation, taxCode and isActive', () => {
    expect(updateProductUnitSchema.safeParse({ id: 'unit_1', name: 'Pieza' }).success).toBe(true);
  });

  it('fails validation when name is empty', () => {
    const result = updateProductUnitSchema.safeParse({ id: 'unit_1', name: '   ' });
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.name).toContain(FIELD_ERRORS.name);
    }
  });

  it('fails validation when abbreviation is longer than 30 characters', () => {
    const result = updateProductUnitSchema.safeParse({
      id: 'unit_1',
      name: 'Pieza',
      abbreviation: 'a'.repeat(31),
    });
    expect(result.success).toBe(false);
  });
});

describe('productUnitParamsSchema', () => {
  it('successfully validates a route id', () => {
    expect(productUnitParamsSchema.safeParse({ id: 'unit_1' }).success).toBe(true);
  });

  it('fails validation when the route id is empty', () => {
    expect(productUnitParamsSchema.safeParse({ id: '' }).success).toBe(false);
  });
});

describe('createProductUnitSchema', () => {
  it('successfully validates a unit without an id', () => {
    expect(
      createProductUnitSchema.safeParse({ name: 'Pieza', abbreviation: 'pza', taxCode: 'H87' })
        .success,
    ).toBe(true);
  });

  it('ignores an unexpected id field', () => {
    const result = createProductUnitSchema.safeParse({ id: 'unit_1', name: 'Pieza' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('id' in result.data).toBe(false);
    }
  });

  it('fails validation when name is empty', () => {
    expect(createProductUnitSchema.safeParse({ name: '   ' }).success).toBe(false);
  });
});
