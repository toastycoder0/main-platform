import { type AnyColumn, and, asc, eq, type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { RequestContext } from '@/infrastructure/context/types';
import { orderEvent, user } from '@/infrastructure/db/schema';
import { ORDER_NOTE_ACTION } from '../application/orders.notes';
import type { OrderNoteDTO } from '../application/orders.types';
import { orderNoteMetadataSchema } from '../application/orders.validation';

const authorUser = alias(user, 'order_note_author');

function fullName(firstName: AnyColumn, lastName: AnyColumn): SQL<string | null> {
  return sql<string | null>`nullif(trim(concat(${firstName}, ' ', ${lastName})), '')`;
}

/**
 * Internal notes only. The buyer DTOs never read them: callers must come from
 * the management surface.
 */
export async function listOrderNotes(
  ctx: RequestContext,
  orderId: string,
): Promise<OrderNoteDTO[]> {
  const rows = await ctx.db
    .select({
      id: orderEvent.id,
      metadata: orderEvent.metadata,
      createdAt: orderEvent.createdAt,
      authorName: fullName(authorUser.firstName, authorUser.lastName),
    })
    .from(orderEvent)
    .leftJoin(authorUser, eq(authorUser.id, orderEvent.actorId))
    .where(and(eq(orderEvent.orderId, orderId), eq(orderEvent.action, ORDER_NOTE_ACTION)))
    .orderBy(asc(orderEvent.createdAt), asc(orderEvent.id));

  return rows.flatMap((row) => {
    const parsed = orderNoteMetadataSchema.safeParse(row.metadata);

    if (!parsed.success) {
      ctx.logger.warn({ orderId, eventId: row.id }, 'Discarding invalid order note');
      return [];
    }

    return [
      {
        id: row.id,
        body: parsed.data.body,
        authorName: row.authorName,
        createdAt: row.createdAt,
      },
    ];
  });
}
