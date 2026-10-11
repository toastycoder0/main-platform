import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import {
  createDocumentTypeSchema,
  documentTypeParamsSchema,
  updateDocumentTypeSchema,
} from './document-types.validation';

describe('updateDocumentTypeSchema', () => {
  it('successfully validates a valid document type update', () => {
    expect(
      updateDocumentTypeSchema.safeParse({
        id: 'doct_1',
        name: 'Ficha técnica',
        description: 'Documento del producto',
        isActive: true,
      }).success,
    ).toBe(true);
  });

  it('allows missing and null description', () => {
    expect(updateDocumentTypeSchema.safeParse({ id: 'doct_1', name: 'Ficha' }).success).toBe(true);
    expect(
      updateDocumentTypeSchema.safeParse({ id: 'doct_1', name: 'Ficha', description: null })
        .success,
    ).toBe(true);
  });

  it('fails validation when name is empty', () => {
    const result = updateDocumentTypeSchema.safeParse({ id: 'doct_1', name: '   ' });
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.name).toContain(FIELD_ERRORS.name);
    }
  });

  it('fails validation when description is longer than 500 characters', () => {
    const result = updateDocumentTypeSchema.safeParse({
      id: 'doct_1',
      name: 'Ficha',
      description: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('documentTypeParamsSchema', () => {
  it('successfully validates a route id', () => {
    expect(documentTypeParamsSchema.safeParse({ id: 'doct_1' }).success).toBe(true);
  });

  it('fails validation when the route id is empty', () => {
    expect(documentTypeParamsSchema.safeParse({ id: '' }).success).toBe(false);
  });
});

describe('createDocumentTypeSchema', () => {
  it('successfully validates a document type without an id', () => {
    expect(
      createDocumentTypeSchema.safeParse({ name: 'Ficha técnica', isActive: false }).success,
    ).toBe(true);
  });

  it('ignores an unexpected id field', () => {
    const result = createDocumentTypeSchema.safeParse({ id: 'doct_1', name: 'Ficha' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('id' in result.data).toBe(false);
    }
  });

  it('fails validation when name is empty', () => {
    expect(createDocumentTypeSchema.safeParse({ name: '   ' }).success).toBe(false);
  });
});
