import type { Transfer } from './warehouse.deltas';

export const MOVEMENT_FORM_KINDS = ['reception', 'transfer', 'materialOut', 'delivery'] as const;

export type MovementFormKind = (typeof MOVEMENT_FORM_KINDS)[number];

export const MOVEMENT_KIND_MAP = {
  reception: { type: 'assign', reason: 'reception' },
  transfer: { type: 'move', reason: 'transfer' },
  materialOut: { type: 'out', reason: 'material_out' },
  delivery: { type: 'out', reason: 'delivery' },
} as const satisfies Record<MovementFormKind, { type: string; reason: string }>;

export const MOVEMENT_FORM_COLUMNS = {
  reception: ['lot', 'destinationCell', 'quantity'],
  transfer: ['lot', 'originCell', 'destinationCell', 'quantity'],
  materialOut: ['lot', 'originCell', 'quantity'],
  delivery: ['lot', 'originCell', 'quantity'],
} as const satisfies Record<MovementFormKind, readonly MovementFormColumn[]>;

export type MovementFormColumn = 'lot' | 'originCell' | 'destinationCell' | 'quantity';

export interface MovementFormRow {
  lotId: string;
  originCellId: string;
  destinationCellId: string;
  quantity: string;
}

export interface MovementFormPrefill {
  lotId?: string | null;
  cellId?: string | null;
}

export function usesOrigin(kind: MovementFormKind): boolean {
  return kind !== 'reception';
}

export function usesDestination(kind: MovementFormKind): boolean {
  return kind === 'reception' || kind === 'transfer';
}

export function createMovementRow(
  kind: MovementFormKind,
  prefill: MovementFormPrefill = {},
): MovementFormRow {
  return {
    lotId: prefill.lotId ?? '',
    originCellId: usesOrigin(kind) ? (prefill.cellId ?? '') : '',
    destinationCellId: kind === 'reception' ? (prefill.cellId ?? '') : '',
    quantity: '',
  };
}

export function toMovementEntries(
  kind: MovementFormKind,
  rows: readonly MovementFormRow[],
): Transfer[] {
  return rows.map((row) => ({
    lotId: row.lotId,
    originCellId: usesOrigin(kind) ? row.originCellId : null,
    destinationCellId: usesDestination(kind) ? row.destinationCellId : null,
    quantity: Number(row.quantity),
  }));
}
