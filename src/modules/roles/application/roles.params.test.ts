import { describe, expect, it } from 'vitest';
import { loadRolesParams } from './roles.params';

describe('loadRolesParams', () => {
  it('applies defaults for an empty param set', () => {
    expect(loadRolesParams({})).toEqual({ q: null, page: 1, pageSize: 10, permission: null });
  });

  it('accepts well-formed values', () => {
    const params = loadRolesParams({
      q: 'super',
      page: '3',
      pageSize: '25',
      permission: 'admin.users.create',
    });

    expect(params).toEqual({
      q: 'super',
      page: 3,
      pageSize: 25,
      permission: 'admin.users.create',
    });
  });

  it('collapses repeated keys to their first value', () => {
    const params = loadRolesParams({
      page: ['5', '9'],
      permission: ['admin.access', 'admin.roles.edit'],
    });

    expect(params.page).toBe(5);
    expect(params.permission).toBe('admin.access');
  });

  it.each(['abc', '0', '-2', '2.7', ''])('falls back to page 1 for %j', (page) => {
    expect(loadRolesParams({ page }).page).toBe(1);
  });

  it.each(['1', '1000000', 'abc', ''])('falls back to pageSize 10 for %j', (pageSize) => {
    expect(loadRolesParams({ pageSize }).pageSize).toBe(10);
  });

  it('trims the search term', () => {
    expect(loadRolesParams({ q: '  hola  ' }).q).toBe('hola');
  });

  it('treats an empty search as absent', () => {
    expect(loadRolesParams({ q: '   ' }).q).toBeNull();
  });

  it('drops search terms above the length limit', () => {
    expect(loadRolesParams({ q: 'x'.repeat(101) }).q).toBeNull();
  });

  it.each([
    'adminusers',
    'admin..users',
    'Admin.users',
    'admin.users create',
    'DROP TABLE roles',
  ])('drops malformed permission %j', (permission) => {
    expect(loadRolesParams({ permission }).permission).toBeNull();
  });
});
