import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import {
  createRoleSchema,
  roleFormSchema,
  roleParamsSchema,
  updateRoleSchema,
} from './roles.validation';

describe('updateRoleSchema', () => {
  it('successfully validates a valid role update', () => {
    const validData = {
      id: 'role_1',
      name: 'Administrador',
      description: 'Rol con acceso total',
      permissionIds: ['perm_1'],
    };

    const result = updateRoleSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('allows a missing or null description', () => {
    expect(
      updateRoleSchema.safeParse({ id: 'role_1', name: 'Admin', permissionIds: ['perm_1'] })
        .success,
    ).toBe(true);
    expect(
      updateRoleSchema.safeParse({
        id: 'role_1',
        name: 'Admin',
        description: null,
        permissionIds: ['perm_1'],
      }).success,
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
      permissionIds: ['perm_1'],
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.description).toContain(FIELD_ERRORS.description);
    }
  });

  it('fails validation when permissionIds is missing', () => {
    const result = updateRoleSchema.safeParse({ id: 'role_1', name: 'Admin' });

    expect(result.success).toBe(false);
  });

  it('fails validation when permissionIds is empty', () => {
    const result = updateRoleSchema.safeParse({
      id: 'role_1',
      name: 'Admin',
      permissionIds: [],
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.permissionIds).toContain(FIELD_ERRORS.permissions);
    }
  });

  it('fails validation when a permission id is empty', () => {
    const result = updateRoleSchema.safeParse({
      id: 'role_1',
      name: 'Admin',
      permissionIds: ['perm_1', ''],
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.permissionIds).toContain(FIELD_ERRORS.required);
    }
  });

  it('successfully validates multiple permission ids', () => {
    const result = updateRoleSchema.safeParse({
      id: 'role_1',
      name: 'Admin',
      permissionIds: ['perm_1', 'perm_2'],
    });

    expect(result.success).toBe(true);
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

describe('createRoleSchema', () => {
  it('successfully validates a role without an id', () => {
    const result = createRoleSchema.safeParse({
      name: 'Gerente',
      description: null,
      permissionIds: ['perm_1'],
    });
    expect(result.success).toBe(true);
  });

  it('ignores an unexpected id field', () => {
    const result = createRoleSchema.safeParse({
      id: 'role_1',
      name: 'Gerente',
      permissionIds: ['perm_1'],
    });
    expect(result.success).toBe(true);

    if (result.success) {
      expect('id' in result.data).toBe(false);
    }
  });

  it('fails validation when name is empty', () => {
    const result = createRoleSchema.safeParse({ name: '   ', permissionIds: ['perm_1'] });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.name).toContain(FIELD_ERRORS.name);
    }
  });

  it('fails validation when permissionIds is empty', () => {
    const result = createRoleSchema.safeParse({ name: 'Gerente', permissionIds: [] });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.permissionIds).toContain(FIELD_ERRORS.permissions);
    }
  });
});

describe('roleFormSchema', () => {
  it('allows a missing id for create mode', () => {
    const result = roleFormSchema.safeParse({
      name: 'Gerente',
      permissionIds: ['perm_1'],
    });
    expect(result.success).toBe(true);
  });

  it('keeps the id when provided for edit mode', () => {
    const result = roleFormSchema.safeParse({
      id: 'role_1',
      name: 'Gerente',
      permissionIds: ['perm_1'],
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.id).toBe('role_1');
    }
  });

  it('fails validation when an id is present but empty', () => {
    const result = roleFormSchema.safeParse({
      id: '',
      name: 'Gerente',
      permissionIds: ['perm_1'],
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors.id).toContain(FIELD_ERRORS.required);
    }
  });
});
