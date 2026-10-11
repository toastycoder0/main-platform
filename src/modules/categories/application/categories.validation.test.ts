import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import {
  categoryParamsSchema,
  createCategorySchema,
  moveCategorySchema,
  reorderCategorySchema,
  toggleCategoryActiveSchema,
  updateCategorySchema,
} from './categories.validation';

describe('createCategorySchema', () => {
  it('successfully validates a create payload with only name', () => {
    const result = createCategorySchema.safeParse({ name: 'Pisos' });
    expect(result.success).toBe(true);
  });

  it('allows a parentId', () => {
    expect(createCategorySchema.safeParse({ name: 'Vinílicos', parentId: 'cat_1' }).success).toBe(
      true,
    );
  });

  it('allows a null parentId', () => {
    expect(createCategorySchema.safeParse({ name: 'Pisos', parentId: null }).success).toBe(true);
  });

  it('allows a missing or null description', () => {
    expect(createCategorySchema.safeParse({ name: 'Pisos' }).success).toBe(true);
    expect(createCategorySchema.safeParse({ name: 'Pisos', description: null }).success).toBe(true);
  });

  it('allows isActive to be omitted', () => {
    const result = createCategorySchema.safeParse({ name: 'Pisos' });
    expect(result.success).toBe(true);
  });

  it('accepts isActive as boolean', () => {
    expect(createCategorySchema.safeParse({ name: 'Pisos', isActive: true }).success).toBe(true);
    expect(createCategorySchema.safeParse({ name: 'Pisos', isActive: false }).success).toBe(true);
  });

  it('fails validation when name is empty', () => {
    const result = createCategorySchema.safeParse({ name: '   ' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.name).toContain(FIELD_ERRORS.name);
    }
  });
});

describe('updateCategorySchema', () => {
  it('successfully validates a valid update payload', () => {
    const result = updateCategorySchema.safeParse({
      id: 'cat_1',
      name: 'Pisos renovados',
      description: 'Nueva descripción',
    });
    expect(result.success).toBe(true);
  });

  it('allows a missing or null description', () => {
    expect(updateCategorySchema.safeParse({ id: 'cat_1', name: 'Pisos' }).success).toBe(true);
    expect(
      updateCategorySchema.safeParse({ id: 'cat_1', name: 'Pisos', description: null }).success,
    ).toBe(true);
  });

  it('allows isActive to be omitted', () => {
    const result = updateCategorySchema.safeParse({ id: 'cat_1', name: 'Pisos' });
    expect(result.success).toBe(true);
  });

  it('fails validation when id is empty', () => {
    const result = updateCategorySchema.safeParse({ id: '', name: 'Pisos' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.id).toContain(FIELD_ERRORS.required);
    }
  });

  it('fails validation when name is empty', () => {
    const result = updateCategorySchema.safeParse({ id: 'cat_1', name: '   ' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.name).toContain(FIELD_ERRORS.name);
    }
  });
});

describe('categoryParamsSchema', () => {
  it('successfully validates a route id', () => {
    const result = categoryParamsSchema.safeParse({ id: 'cat_1' });
    expect(result.success).toBe(true);
  });

  it('fails validation when the route id is empty', () => {
    const result = categoryParamsSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });
});

describe('reorderCategorySchema', () => {
  it('successfully validates a valid reorder payload', () => {
    const result = reorderCategorySchema.safeParse({ id: 'cat_1', direction: 'up' });
    expect(result.success).toBe(true);
  });

  it('accepts down direction', () => {
    const result = reorderCategorySchema.safeParse({ id: 'cat_1', direction: 'down' });
    expect(result.success).toBe(true);
  });

  it('fails with an invalid direction', () => {
    const result = reorderCategorySchema.safeParse({ id: 'cat_1', direction: 'left' });
    expect(result.success).toBe(false);
  });

  it('fails validation when id is empty', () => {
    const result = reorderCategorySchema.safeParse({ id: '', direction: 'up' });
    expect(result.success).toBe(false);
  });
});

describe('moveCategorySchema', () => {
  it('successfully validates a valid move payload', () => {
    const result = moveCategorySchema.safeParse({ id: 'cat_1', newParentId: 'cat_2' });
    expect(result.success).toBe(true);
  });

  it('allows newParentId to be null for moving to root', () => {
    const result = moveCategorySchema.safeParse({ id: 'cat_1', newParentId: null });
    expect(result.success).toBe(true);
  });

  it('allows newParentId to be omitted', () => {
    const result = moveCategorySchema.safeParse({ id: 'cat_1' });
    expect(result.success).toBe(true);
  });

  it('fails validation when id is empty', () => {
    const result = moveCategorySchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });
});

describe('toggleCategoryActiveSchema', () => {
  it('successfully validates a valid toggle payload', () => {
    const result = toggleCategoryActiveSchema.safeParse({ id: 'cat_1', isActive: false });
    expect(result.success).toBe(true);
  });

  it('accepts true for isActive', () => {
    const result = toggleCategoryActiveSchema.safeParse({ id: 'cat_1', isActive: true });
    expect(result.success).toBe(true);
  });

  it('fails when isActive is missing', () => {
    const result = toggleCategoryActiveSchema.safeParse({ id: 'cat_1' });
    expect(result.success).toBe(false);
  });

  it('fails validation when id is empty', () => {
    const result = toggleCategoryActiveSchema.safeParse({ id: '', isActive: true });
    expect(result.success).toBe(false);
  });
});
