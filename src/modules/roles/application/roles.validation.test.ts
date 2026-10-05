import { describe, expect, it } from 'vitest';
import { rolesListParamsSchema } from './roles.validation';

describe('rolesListParamsSchema', () => {
  it('keeps the base defaults', () => {
    expect(rolesListParamsSchema.parse({})).toEqual({ page: 1, pageSize: 10 });
  });

  it('accepts a well-formed permission slug', () => {
    expect(rolesListParamsSchema.parse({ permission: 'admin.users.create' }).permission).toBe(
      'admin.users.create',
    );
  });

  it.each([
    'adminusers',
    'admin..users',
    'Admin.users',
    'admin.users create',
    'DROP TABLE roles',
  ])('drops malformed permission %j', (permission) => {
    expect(rolesListParamsSchema.parse({ permission }).permission).toBeUndefined();
  });

  it('collapses repeated permission keys to their first value', () => {
    const result = rolesListParamsSchema.parse({
      permission: ['admin.access', 'admin.roles.edit'],
    });

    expect(result.permission).toBe('admin.access');
  });

  it('passes the base search through', () => {
    expect(rolesListParamsSchema.parse({ q: 'super' }).q).toBe('super');
  });
});
