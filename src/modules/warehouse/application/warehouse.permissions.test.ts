import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { MOVEMENT_FORM_PERMISSIONS, permittedMovementKinds } from './warehouse.permissions';

describe('MOVEMENT_FORM_PERMISSIONS', () => {
  it('maps every kind to its permission', () => {
    expect(MOVEMENT_FORM_PERMISSIONS).toEqual({
      reception: PERMISSIONS.warehouse.stock.reception,
      transfer: PERMISSIONS.warehouse.stock.transfer,
      materialOut: PERMISSIONS.warehouse.stock.materialOut,
      delivery: PERMISSIONS.warehouse.stock.delivery,
    });
  });
});

describe('permittedMovementKinds', () => {
  it('returns only the kinds whose permission is present', () => {
    const permissions = new Set([
      PERMISSIONS.warehouse.stock.transfer,
      PERMISSIONS.warehouse.stock.delivery,
    ]);

    expect(permittedMovementKinds(permissions)).toEqual(['transfer', 'delivery']);
  });

  it('returns an empty list without stock permissions', () => {
    expect(permittedMovementKinds(new Set())).toEqual([]);
  });
});
