import { describe, expect, it } from 'vitest';
import {
  getPermissionGroupKey,
  getPermissionGroupLabel,
  PERMISSION_GROUP_LABELS,
  PERMISSIONS,
} from './permissions';

type PermissionNode = string | { readonly [key: string]: PermissionNode };

function collectSlugs(node: PermissionNode): string[] {
  if (typeof node === 'string') {
    return [node];
  }

  return Object.values(node).flatMap(collectSlugs);
}

describe('permission group labels', () => {
  it('resolves the group key from a permission slug', () => {
    expect(getPermissionGroupKey('admin.access')).toBe('admin');
    expect(getPermissionGroupKey('admin.currencies.create')).toBe('admin.currencies');
    expect(getPermissionGroupKey('warehouse.stock.reception')).toBe('warehouse.stock');
  });

  it('resolves a readable label for every permission group', () => {
    expect(getPermissionGroupLabel('admin.currencies.create')).toBe('Monedas');
    expect(getPermissionGroupLabel('warehouse.stock.reception')).toBe('Stock');
  });

  it('has a label for every permission in the catalog', () => {
    for (const slug of collectSlugs(PERMISSIONS)) {
      const key = getPermissionGroupKey(slug);

      expect(PERMISSION_GROUP_LABELS).toHaveProperty(key);
    }
  });
});
