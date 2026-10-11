import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import { createTagSchema, tagParamsSchema, updateTagSchema } from './tags.validation';

describe('updateTagSchema', () => {
  it('successfully validates a valid tag update', () => {
    expect(
      updateTagSchema.safeParse({
        id: 'tag_1',
        name: 'Oferta',
        description: 'Para ofertas',
        isActive: true,
      }).success,
    ).toBe(true);
  });

  it('allows missing and null description', () => {
    expect(updateTagSchema.safeParse({ id: 'tag_1', name: 'Oferta' }).success).toBe(true);
    expect(
      updateTagSchema.safeParse({ id: 'tag_1', name: 'Oferta', description: null }).success,
    ).toBe(true);
  });

  it('fails validation when name is empty', () => {
    const result = updateTagSchema.safeParse({ id: 'tag_1', name: '   ' });
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.name).toContain(FIELD_ERRORS.name);
    }
  });

  it('fails validation when description is longer than 500 characters', () => {
    const result = updateTagSchema.safeParse({
      id: 'tag_1',
      name: 'Oferta',
      description: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('tagParamsSchema', () => {
  it('successfully validates a route id', () => {
    expect(tagParamsSchema.safeParse({ id: 'tag_1' }).success).toBe(true);
  });

  it('fails validation when the route id is empty', () => {
    expect(tagParamsSchema.safeParse({ id: '' }).success).toBe(false);
  });
});

describe('createTagSchema', () => {
  it('successfully validates a tag without an id', () => {
    expect(createTagSchema.safeParse({ name: 'Oferta', isActive: false }).success).toBe(true);
  });

  it('ignores an unexpected id field', () => {
    const result = createTagSchema.safeParse({ id: 'tag_1', name: 'Oferta' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('id' in result.data).toBe(false);
    }
  });

  it('fails validation when name is empty', () => {
    expect(createTagSchema.safeParse({ name: '   ' }).success).toBe(false);
  });
});
