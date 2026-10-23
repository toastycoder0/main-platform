import type { ReservationSummary } from './orders.guards';
import { ORDER_ACTION_LABELS, ORDER_ACTIONS, ORDER_TRANSITIONS } from './orders.transitions';
import type { OrderAction, OrderActionOption, OrderStatus } from './orders.types';

export interface AvailableActionsInput {
  status: OrderStatus;
  permissions: ReadonlySet<string>;
  reservation: ReservationSummary;
}

/**
 * Server-side answer to "what can this actor do with this order". The UI only
 * renders these options, so it never decides with `role` or hardcoded lists.
 */
export function availableActions({
  status,
  permissions,
  reservation,
}: AvailableActionsInput): OrderActionOption[] {
  return ORDER_ACTIONS.flatMap((action: OrderAction) => {
    const transition = ORDER_TRANSITIONS[action];

    if (!permissions.has(transition.permission)) {
      return [];
    }

    if (action !== 'overrideOrderStatus' && !transition.from.includes(status)) {
      return [];
    }

    return [
      {
        action,
        label: ORDER_ACTION_LABELS[action],
        disabledReason: transition.guard?.({ status, reservation }) ?? null,
      },
    ];
  });
}
