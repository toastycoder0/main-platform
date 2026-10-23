import type { OrderActivityDTO, OrderStatus } from './orders.types';

export interface OrderActivityEvent {
  id: string;
  action: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus | null;
  reason: string | null;
  actorName: string | null;
  createdAt: Date;
}

const ACTIVITY_LABELS: Record<string, string> = {
  note_added: 'Nota interna',
  evidence_added: 'Comprobante agregado',
  evidence_removed: 'Comprobante quitado',
  markOrderPaid: 'Marcado como pagado',
  completeOrder: 'Completado',
  cancelOrder: 'Cancelado',
  overrideOrderStatus: 'Estado cambiado (excepción)',
};

export function activityLabel(action: string): string {
  return ACTIVITY_LABELS[action] ?? action;
}

/** Chronological view of the append-only log; the current state is only a projection. */
export function buildOrderActivity(events: readonly OrderActivityEvent[]): OrderActivityDTO[] {
  return [...events]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
    .map((event) => ({
      id: event.id,
      action: event.action,
      label: activityLabel(event.action),
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      reason: event.reason,
      actorName: event.actorName,
      createdAt: event.createdAt,
    }));
}
