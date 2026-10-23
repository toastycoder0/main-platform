import { PERMISSIONS } from '@/shared/constants/permissions';
import { expiredReservationGuard, type TransitionGuardContext } from './orders.guards';
import type { OrderAction, OrderStatus } from './orders.types';

export type ReservationEffect = 'always' | readonly OrderStatus[];

export interface TransitionDefinition {
  /** States the action can start from. */
  from: readonly OrderStatus[];
  /** Written on success; `null` for the override, which takes a target. */
  to: OrderStatus | null;
  permission: string;
  /** Pure check that can still block an otherwise valid transition. */
  guard?: (context: TransitionGuardContext) => string | null;
  releasesReservations: ReservationEffect;
}

export const ORDER_ACTION_LABELS: Record<OrderAction, string> = {
  markOrderPaid: 'Marcar como pagado',
  completeOrder: 'Completar pedido',
  cancelOrder: 'Cancelar pedido',
  overrideOrderStatus: 'Cambiar estado (excepción)',
};

export const ORDER_ACTIONS: readonly OrderAction[] = [
  'markOrderPaid',
  'completeOrder',
  'cancelOrder',
  'overrideOrderStatus',
];

const OVERRIDE_TARGETS: readonly OrderStatus[] = ['pending', 'paid', 'completed', 'cancelled'];

/**
 * Single source of truth for order state changes. Normal transitions never
 * leave a terminal state; only the override does, because it is the audited
 * escape hatch.
 */
export const ORDER_TRANSITIONS: Record<OrderAction, TransitionDefinition> = {
  markOrderPaid: {
    from: ['pending'],
    to: 'paid',
    permission: PERMISSIONS.orders.manage,
    guard: expiredReservationGuard,
    releasesReservations: 'always',
  },
  completeOrder: {
    from: ['paid'],
    to: 'completed',
    permission: PERMISSIONS.orders.manage,
    releasesReservations: [],
  },
  cancelOrder: {
    from: ['pending', 'paid'],
    to: 'cancelled',
    permission: PERMISSIONS.orders.cancel,
    releasesReservations: 'always',
  },
  overrideOrderStatus: {
    from: OVERRIDE_TARGETS,
    to: null,
    permission: PERMISSIONS.orders.status.override,
    releasesReservations: ['paid', 'cancelled'],
  },
};

export function resolvesTo(action: OrderAction, target?: OrderStatus): OrderStatus | null {
  return ORDER_TRANSITIONS[action].to ?? target ?? null;
}

export function isTransitionAllowed(action: OrderAction, status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[action].from.includes(status);
}

/** Overrides into `paid`/`cancelled` must free stock just like the normal actions. */
export function releasesReservations(action: OrderAction, target: OrderStatus): boolean {
  const effect = ORDER_TRANSITIONS[action].releasesReservations;
  return effect === 'always' || effect.includes(target);
}
