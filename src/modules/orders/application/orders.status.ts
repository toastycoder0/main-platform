import type { OrderStatus, OrderTimelineStep } from './orders.types';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

/** Happy path; `cancelled` is terminal and replaces the whole sequence. */
const TIMELINE_SEQUENCE: OrderStatus[] = ['pending', 'paid', 'completed'];

export function buildOrderTimeline(status: OrderStatus): OrderTimelineStep[] {
  if (status === 'cancelled') {
    return [
      {
        status: 'cancelled',
        label: ORDER_STATUS_LABELS.cancelled,
        reached: true,
        current: true,
      },
    ];
  }

  const currentIndex = TIMELINE_SEQUENCE.indexOf(status);

  return TIMELINE_SEQUENCE.map((step, index) => ({
    status: step,
    label: ORDER_STATUS_LABELS[step],
    reached: index <= currentIndex,
    current: index === currentIndex,
  }));
}
