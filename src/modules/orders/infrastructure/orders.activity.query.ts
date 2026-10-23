import { type AnyColumn, asc, eq, type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { RequestContext } from '@/infrastructure/context/types';
import { orderEvent, user } from '@/infrastructure/db/schema';
import { buildOrderActivity } from '../application/orders.activity';
import type { OrderActivityDTO } from '../application/orders.types';

const actorUser = alias(user, 'order_event_actor');

function fullName(firstName: AnyColumn, lastName: AnyColumn): SQL<string | null> {
  return sql<string | null>`nullif(trim(concat(${firstName}, ' ', ${lastName})), '')`;
}

/**
 * Full log of an order, including internal notes and management evidence, so it
 * belongs to the management surface only.
 */
export async function listOrderActivity(
  ctx: RequestContext,
  orderId: string,
): Promise<OrderActivityDTO[]> {
  const rows = await ctx.db
    .select({
      id: orderEvent.id,
      action: orderEvent.action,
      fromStatus: orderEvent.fromStatus,
      toStatus: orderEvent.toStatus,
      reason: orderEvent.reason,
      createdAt: orderEvent.createdAt,
      actorName: fullName(actorUser.firstName, actorUser.lastName),
    })
    .from(orderEvent)
    .leftJoin(actorUser, eq(actorUser.id, orderEvent.actorId))
    .where(eq(orderEvent.orderId, orderId))
    .orderBy(asc(orderEvent.createdAt), asc(orderEvent.id));

  return buildOrderActivity(rows);
}
