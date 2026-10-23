import type { DbLike } from '@/infrastructure/db';
import { orderEvent } from '@/infrastructure/db/schema';
import { ORDER_NOTE_ACTION } from '../application/orders.notes';

export interface AddOrderNoteInput {
  orderId: string;
  body: string;
  actorId: string;
}

/**
 * Notes are append-only events, never a table of their own: a correction is a
 * new note, so the log keeps what the order said at every moment.
 */
export async function addOrderNote(db: DbLike, input: AddOrderNoteInput): Promise<void> {
  await db.insert(orderEvent).values({
    orderId: input.orderId,
    action: ORDER_NOTE_ACTION,
    actorId: input.actorId,
    metadata: { body: input.body, visibility: 'internal' },
  });
}
