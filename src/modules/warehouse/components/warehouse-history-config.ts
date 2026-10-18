import {
  MOVEMENT_REASONS,
  MOVEMENT_TYPES,
  type MovementReason,
  type MovementType,
} from '../application/warehouse.validation';

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  assign: 'Recepción',
  move: 'Transferencia',
  out: 'Salida',
  revert: 'Reversión',
};

export const MOVEMENT_REASON_LABELS: Record<MovementReason, string> = {
  reception: 'Recepción',
  transfer: 'Transferencia',
  material_out: 'Salida de material',
  delivery: 'Entrega',
};

export const MOVEMENT_TYPE_OPTIONS = MOVEMENT_TYPES.map((value) => ({
  value,
  label: MOVEMENT_TYPE_LABELS[value],
}));

export const MOVEMENT_REASON_OPTIONS = MOVEMENT_REASONS.map((value) => ({
  value,
  label: MOVEMENT_REASON_LABELS[value],
}));

export function formatMovementDate(value: Date): string {
  return value.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatMovementQuantity(value: number): string {
  return value.toLocaleString('es-MX', { maximumFractionDigits: 4 });
}
