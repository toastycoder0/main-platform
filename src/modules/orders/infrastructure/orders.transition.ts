import { eq, sql } from 'drizzle-orm';
import { releaseOrderReservations } from '@/infrastructure/catalog/stock-reservation.repository';
import type { DbLike } from '@/infrastructure/db';
import { order, orderEvent, stockReservation } from '@/infrastructure/db/schema';
import type { AuthenticatedContext } from '@/infrastructure/services/action';
import { AppError } from '@/shared/errors';
import type { ReservationSummary } from '../application/orders.guards';
import {
  isTransitionAllowed,
  ORDER_TRANSITIONS,
  releasesReservations,
  resolvesTo,
} from '../application/orders.transitions';
import type { OrderAction, OrderStatus } from '../application/orders.types';

export interface ApplyTransitionInput {
  orderId: string;
  action: OrderAction;
  /** Override only; ignored by the rest, whose target is fixed by the table. */
  target?: OrderStatus;
  reason?: string | null;
}

const STATE_CHANGED =
  'El pedido cambió mientras lo revisabas. Recarga la página e inténtalo de nuevo.';
const SAME_STATE = 'El pedido ya está en ese estado.';

async function reservationSummary(tx: DbLike, orderId: string): Promise<ReservationSummary> {
  const [row] = await tx
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`coalesce(count(*) filter (where ${stockReservation.expiresAt} > now()), 0)::int`,
    })
    .from(stockReservation)
    .where(eq(stockReservation.orderId, orderId));

  return { total: row?.total ?? 0, active: row?.active ?? 0 };
}

async function lockOrder(tx: DbLike, orderId: string): Promise<OrderStatus> {
  const [row] = await tx
    .select({ status: order.status })
    .from(order)
    .where(eq(order.id, orderId))
    .for('update');

  if (!row) {
    throw new AppError('not_found', 'El pedido no existe');
  }

  return row.status;
}

function assertTransition(action: OrderAction, current: OrderStatus, target: OrderStatus): void {
  if (current === target) {
    throw new AppError('invalid_input', SAME_STATE);
  }

  if (!isTransitionAllowed(action, current)) {
    throw new AppError('invalid_input', STATE_CHANGED);
  }
}

/**
 * The only way to change `order.status`: locks the row, re-checks the state the
 * table expects, runs the pure guard, writes the status, appends the event and
 * applies the effects, all in one transaction.
 */
export function applyTransition(
  ctx: AuthenticatedContext,
  input: ApplyTransitionInput,
): Promise<OrderStatus> {
  const transition = ORDER_TRANSITIONS[input.action];
  const target = resolvesTo(input.action, input.target);

  if (!target) {
    throw new AppError('invalid_input', 'Indica el estado destino.');
  }

  return ctx.db.transaction(async (tx) => {
    const current = await lockOrder(tx, input.orderId);

    assertTransition(input.action, current, target);

    const disabledReason = transition.guard?.({
      status: current,
      reservation: await reservationSummary(tx, input.orderId),
    });

    if (disabledReason) {
      throw new AppError('invalid_input', disabledReason);
    }

    await tx.update(order).set({ status: target }).where(eq(order.id, input.orderId));

    await tx.insert(orderEvent).values({
      orderId: input.orderId,
      action: input.action,
      fromStatus: current,
      toStatus: target,
      actorId: ctx.session.user.id,
      reason: input.reason ?? null,
    });

    if (releasesReservations(input.action, target)) {
      await releaseOrderReservations(tx, input.orderId);
    }

    return target;
  });
}
