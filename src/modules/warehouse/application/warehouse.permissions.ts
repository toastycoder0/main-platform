import { PERMISSIONS } from '@/shared/constants/permissions';
import { MOVEMENT_FORM_KINDS, type MovementFormKind } from './warehouse.movement';

export const MOVEMENT_FORM_PERMISSIONS = {
  reception: PERMISSIONS.warehouse.stock.reception,
  transfer: PERMISSIONS.warehouse.stock.transfer,
  materialOut: PERMISSIONS.warehouse.stock.materialOut,
  delivery: PERMISSIONS.warehouse.stock.delivery,
} as const satisfies Record<MovementFormKind, string>;

export function permittedMovementKinds(permissions: ReadonlySet<string>): MovementFormKind[] {
  return MOVEMENT_FORM_KINDS.filter((kind) => permissions.has(MOVEMENT_FORM_PERMISSIONS[kind]));
}
