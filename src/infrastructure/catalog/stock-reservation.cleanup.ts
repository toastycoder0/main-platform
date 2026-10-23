import { lte, sql } from 'drizzle-orm';
import type { DbLike } from '@/infrastructure/db';
import { stockReservation } from '@/infrastructure/db/schema';

/**
 * Expired holds are already inert, so deleting them only keeps the table small.
 * The cutoff uses the database clock, the same one the availability queries use,
 * so a skew between app and database time cannot release stock early.
 */
export async function purgeExpiredReservations(db: DbLike): Promise<{ deleted: number }> {
  const rows = await db
    .delete(stockReservation)
    .where(lte(stockReservation.expiresAt, sql`now()`))
    .returning({ id: stockReservation.id });

  return { deleted: rows.length };
}
