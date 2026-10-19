import { format, isSameDay, isSameYear } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowRightLeftIcon,
  LogOutIcon,
  type LucideIcon,
  PackagePlusIcon,
  TruckIcon,
  Undo2Icon,
} from 'lucide-react';
import {
  MOVEMENT_FILTER_VALUES,
  type MovementFilterValue,
  type MovementReason,
  type MovementType,
} from '../application/warehouse.validation';

export type MovementHistoryView = 'movements' | 'entries';

export const MOVEMENT_HISTORY_COPY: Record<
  MovementHistoryView,
  {
    title: string;
    searchLabel: string;
    searchPlaceholder: string;
  }
> = {
  movements: {
    title: 'Movimientos',
    searchLabel: 'Buscar en movimientos',
    searchPlaceholder: 'Buscar por # de movimiento, lote, producto, celda o nota…',
  },
  entries: {
    title: 'Elementos',
    searchLabel: 'Buscar en elementos',
    searchPlaceholder: 'Buscar por lote, producto, celda, nota o # de movimiento…',
  },
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  assign: 'Asignación de celda',
  move: 'Movimiento entre celdas',
  out: 'Salida',
  revert: 'Reversión',
};

export const MOVEMENT_REASON_LABELS: Record<MovementReason, string> = {
  reception: 'Asignación de celda',
  transfer: 'Movimiento entre celdas',
  material_out: 'Salida de materiales',
  delivery: 'Entrega por pedido',
};

export const MOVEMENT_FILTER_OPTIONS: Array<{
  value: MovementFilterValue;
  label: string;
}> = MOVEMENT_FILTER_VALUES.map((value) => ({
  value,
  label: value === 'revert' ? MOVEMENT_TYPE_LABELS.revert : MOVEMENT_REASON_LABELS[value],
}));

export interface MovementKindConfig {
  label: string;
  icon: LucideIcon;
  badgeClassName: string;
}

export const MOVEMENT_KIND_CONFIG: Record<MovementFilterValue, MovementKindConfig> = {
  reception: {
    label: MOVEMENT_REASON_LABELS.reception,
    icon: PackagePlusIcon,
    badgeClassName:
      'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  },
  transfer: {
    label: MOVEMENT_REASON_LABELS.transfer,
    icon: ArrowRightLeftIcon,
    badgeClassName: 'bg-sky-500/10 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  },
  material_out: {
    label: MOVEMENT_REASON_LABELS.material_out,
    icon: LogOutIcon,
    badgeClassName: 'bg-orange-500/10 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  },
  delivery: {
    label: MOVEMENT_REASON_LABELS.delivery,
    icon: TruckIcon,
    badgeClassName: 'bg-violet-500/10 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  },
  revert: {
    label: MOVEMENT_TYPE_LABELS.revert,
    icon: Undo2Icon,
    badgeClassName: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  },
};

export function movementKind(
  type: MovementType,
  reason: MovementReason | null,
): MovementFilterValue {
  if (type === 'revert') {
    return 'revert';
  }

  if (reason) {
    return reason;
  }

  // The DB check requires a reason for every non-revert movement; this mapping
  // only keeps the helper total for unexpected data.
  if (type === 'assign') {
    return 'reception';
  }

  return type === 'move' ? 'transfer' : 'material_out';
}

export function formatMovementDate(value: Date): string {
  return value.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatMovementDateShort(value: Date): string {
  const now = new Date();

  if (isSameDay(value, now)) {
    return `Hoy, ${format(value, 'HH:mm')}`;
  }

  if (isSameYear(value, now)) {
    return format(value, 'd MMM, HH:mm', { locale: es });
  }

  return format(value, 'd MMM yyyy, HH:mm', { locale: es });
}

export function formatMovementQuantity(value: number): string {
  return value.toLocaleString('es-MX', { maximumFractionDigits: 4 });
}
