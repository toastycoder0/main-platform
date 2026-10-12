import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import {
  brandFormSchema,
  brandParamsSchema,
  createBrandSchema,
  updateBrandSchema,
} from './brands.validation';

describe('updateBrandSchema', () => {
  it('successfully validates a valid brand update', () => {
    const result = updateBrandSchema.safeParse({
      id: 'brd_1',
      name: 'Marca Norte',
      description: 'Marca del norte',
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it('allows a missing, null description and a missing isActive', () => {
    expect(updateBrandSchema.safeParse({ id: 'brd_1', name: 'Marca' }).success).toBe(true);
    expect(
      updateBrandSchema.safeParse({ id: 'brd_1', name: 'Marca', description: null }).success,
    ).toBe(true);
  });

  it('accepts image as optional string', () => {
    expect(
      updateBrandSchema.safeParse({ id: 'brd_1', name: 'Marca', image: 'temp_key_123' }).success,
    ).toBe(true);
    expect(updateBrandSchema.safeParse({ id: 'brd_1', name: 'Marca' }).success).toBe(true);
  });

  it('fails validation when id is empty', () => {
    const result = updateBrandSchema.safeParse({ id: '', name: 'Marca' });
    expect(result.success).toBe(false);
  });

  it('fails validation when name is empty', () => {
    const result = updateBrandSchema.safeParse({ id: 'brd_1', name: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.name).toContain(FIELD_ERRORS.name);
    }
  });

  it('fails validation when name is longer than 100 characters', () => {
    const result = updateBrandSchema.safeParse({ id: 'brd_1', name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('fails validation when description is longer than 500 characters', () => {
    const result = updateBrandSchema.safeParse({
      id: 'brd_1',
      name: 'Marca',
      description: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.description).toContain(
        FIELD_ERRORS.description,
      );
    }
  });
});

describe('brandParamsSchema', () => {
  it('successfully validates a route id', () => {
    expect(brandParamsSchema.safeParse({ id: 'brd_1' }).success).toBe(true);
  });

  it('fails validation when the route id is empty', () => {
    expect(brandParamsSchema.safeParse({ id: '' }).success).toBe(false);
  });
});

describe('createBrandSchema', () => {
  it('successfully validates a brand without an id', () => {
    expect(createBrandSchema.safeParse({ name: 'Marca', isActive: false }).success).toBe(true);
  });

  it('ignores an unexpected id field', () => {
    const result = createBrandSchema.safeParse({ id: 'brd_1', name: 'Marca' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('id' in result.data).toBe(false);
    }
  });

  it('accepts image as optional string', () => {
    expect(createBrandSchema.safeParse({ name: 'Marca', image: 'temp_key_123' }).success).toBe(
      true,
    );
    expect(createBrandSchema.safeParse({ name: 'Marca' }).success).toBe(true);
  });

  it('fails validation when name is empty', () => {
    expect(createBrandSchema.safeParse({ name: '   ' }).success).toBe(false);
  });
});

describe('brandFormSchema', () => {
  it('allows a missing id for create mode', () => {
    expect(brandFormSchema.safeParse({ name: 'Marca' }).success).toBe(true);
  });

  it('keeps the id when provided for edit mode', () => {
    const result = brandFormSchema.safeParse({ id: 'brd_1', name: 'Marca' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('brd_1');
    }
  });
});
