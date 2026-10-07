import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import { roleParamsSchema, updateRoleSchema } from './roles.validation';

describe('updateRoleSchema', () => {
  it('successfully validates a valid role update', () => {
    const validData = {
      id: 'role_1',
      name: 'Administrador',
      description: 'Rol con acceso total',
    };

    const result = updateRoleSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('allows a missing or null description', () => {
    expect(updateRoleSchema.safeParse({ id: 'role_1', name: 'Admin' }).success).toBe(true);
    expect(
      updateRoleSchema.safeParse({ id: 'role_1', name: 'Admin', description: null }).success,
    ).toBe(true);
  });

  it('fails validation when id is empty', () => {
    const result = updateRoleSchema.safeParse({ id: '', name: 'Admin' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.id).toContain(FIELD_ERRORS.required);
    }
  });

  it('fails validation when name is empty', () => {
    const result = updateRoleSchema.safeParse({ id: 'role_1', name: '   ' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.name).toContain(FIELD_ERRORS.name);
    }
  });

  it('fails validation when name is longer than 100 characters', () => {
    const result = updateRoleSchema.safeParse({ id: 'role_1', name: 'a'.repeat(101) });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.name).toContain(FIELD_ERRORS.name);
    }
  });

  it('fails validation when description is longer than 500 characters', () => {
    const result = updateRoleSchema.safeParse({
      id: 'role_1',
      name: 'Admin',
      description: 'a'.repeat(501),
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.description).toContain(FIELD_ERRORS.description);
    }
  });
});

describe('roleParamsSchema', () => {
  it('successfully validates a route id', () => {
    const result = roleParamsSchema.safeParse({ id: 'role_1' });
    expect(result.success).toBe(true);
  });

  it('fails validation when the route id is empty', () => {
    const result = roleParamsSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });
});
