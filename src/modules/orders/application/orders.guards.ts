import type { OrderStatus } from './orders.types';

/** Holds kept for an order: `active` counts the ones that have not expired yet. */
export interface ReservationSummary {
  total: number;
  active: number;
}

export interface TransitionGuardContext {
  status: OrderStatus;
  reservation: ReservationSummary;
}

/**
 * A hold that already expired cannot back a payment: the stock is free for
 * anyone else, so the order has to be reserved again or cancelled.
 */
export function expiredReservationGuard({ reservation }: TransitionGuardContext): string | null {
  if (reservation.total > 0 && reservation.active === 0) {
    return 'El apartado de inventario venció. Vuelve a apartar el stock o cancela el pedido.';
  }

  return null;
}
