import { and, gt, inArray, sql } from 'drizzle-orm';
import type { DbLike } from '@/infrastructure/db';
import { stockReservation } from '@/infrastructure/db/schema';

const isActive = gt(stockReservation.expiresAt, sql`now()`);

/** Subquery with the quantity currently held per (lot, cell), to subtract from physical stock. */
export function activeReservations(db: DbLike) {
  return db
    .select({
      lotId: stockReservation.lotId,
      cellId: stockReservation.cellId,
      quantity: sql<string>`SUM(${stockReservation.quantity})`.as('reserved_quantity'),
    })
    .from(stockReservation)
    .where(isActive)
    .groupBy(stockReservation.lotId, stockReservation.cellId)
    .as('active_reservation');
}

/** Reserved quantity per cell and lot, in the same shape the warehouse engine reads stock. */
export async function getReservedByCell(
  db: DbLike,
  cellIds: string[],
): Promise<Map<string, Map<string, number>>> {
  const reserved = new Map<string, Map<string, number>>();

  if (cellIds.length === 0) {
    return reserved;
  }

  const rows = await db
    .select({
      cellId: stockReservation.cellId,
      lotId: stockReservation.lotId,
      quantity: sql<string>`SUM(${stockReservation.quantity})`,
    })
    .from(stockReservation)
    .where(and(isActive, inArray(stockReservation.cellId, cellIds)))
    .groupBy(stockReservation.cellId, stockReservation.lotId);

  for (const row of rows) {
    const byLot = reserved.get(row.cellId) ?? new Map<string, number>();
    byLot.set(row.lotId, Number(row.quantity));
    reserved.set(row.cellId, byLot);
  }

  return reserved;
}
