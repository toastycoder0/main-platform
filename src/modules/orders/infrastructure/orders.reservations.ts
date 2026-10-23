import { eq, sql } from 'drizzle-orm';
import type { DbLike } from '@/infrastructure/db';
import { stockReservation } from '@/infrastructure/db/schema';
import type { ReservationSummary } from '../application/orders.guards';

/** Holds kept for an order: `active` counts the ones that have not expired yet. */
export async function getReservationSummary(
  db: DbLike,
  orderId: string,
): Promise<ReservationSummary> {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`coalesce(count(*) filter (where ${stockReservation.expiresAt} > now()), 0)::int`,
    })
    .from(stockReservation)
    .where(eq(stockReservation.orderId, orderId));

  return { total: row?.total ?? 0, active: row?.active ?? 0 };
}
