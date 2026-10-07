import { describe, expect, it } from 'vitest';
import { resolveBreadcrumbs } from './registry';

describe('resolveBreadcrumbs', () => {
  it('resolves the section root label', () => {
    expect(resolveBreadcrumbs('dashboard', '/dashboard')).toEqual([
      { label: 'Panel de control', href: '/dashboard' },
    ]);
  });

  it('resolves a registered exact route', () => {
    expect(resolveBreadcrumbs('dashboard', '/dashboard/roles')).toEqual([
      { label: 'Panel de control', href: '/dashboard' },
      { label: 'Roles', href: '/dashboard/roles' },
    ]);
  });

  it('omits structural path segments that are not registered routes', () => {
    expect(resolveBreadcrumbs('dashboard', '/dashboard/roles/form/role_1')).toEqual([
      { label: 'Panel de control', href: '/dashboard' },
      { label: 'Roles', href: '/dashboard/roles' },
      { label: 'Editar rol', href: '/dashboard/roles/form/role_1' },
    ]);
  });

  it('falls back to the raw segment for the current page when it is not registered', () => {
    expect(resolveBreadcrumbs('dashboard', '/dashboard/foo')).toEqual([
      { label: 'Panel de control', href: '/dashboard' },
      { label: 'foo', href: '/dashboard/foo' },
    ]);
  });

  it('omits unregistered intermediate segments but keeps the current page', () => {
    expect(resolveBreadcrumbs('dashboard', '/dashboard/foo/bar')).toEqual([
      { label: 'Panel de control', href: '/dashboard' },
      { label: 'bar', href: '/dashboard/foo/bar' },
    ]);
  });
});
