import { and, eq, gt, inArray } from 'drizzle-orm';
import type { DbLike } from '@/infrastructure/db';
import { cellLot, lot, stockReservation, warehouseCell } from '@/infrastructure/db/schema';
import { AppError } from '@/shared/errors';
import { allocateReservation, type ReservableSlot } from './stock-reservation.allocate';
import { getReservedByCell } from './stock-reservation.query';

export interface ReservationRequestLine {
  variantId: string;
  quantity: number;
  /** Shown to the user when the stock cannot cover the line. */
  label: string;
}

export interface ReserveStockInput {
  lines: ReservationRequestLine[];
  expiresAt: Date;
  orderId: string | null;
  createdById: string;
}

function readSlots(tx: DbLike, variantIds: string[]) {
  return tx
    .select({
      variantId: lot.itemId,
      lotId: lot.id,
      lotCode: lot.code,
      cellId: cellLot.cellId,
      quantity: cellLot.quantity,
    })
    .from(cellLot)
    .innerJoin(lot, eq(lot.id, cellLot.lotId))
    .innerJoin(warehouseCell, eq(warehouseCell.id, cellLot.cellId))
    .where(
      and(
        inArray(lot.itemId, variantIds),
        eq(lot.isActive, true),
        eq(warehouseCell.isActive, true),
        gt(cellLot.quantity, '0'),
      ),
    );
}

/**
 * Holds stock for the given lines inside the caller's transaction. Cells are
 * locked in id order, the same lock the warehouse engine takes, so neither a
 * movement nor another reservation can consume the quantity concurrently.
 */
export async function reserveStock(tx: DbLike, input: ReserveStockInput): Promise<void> {
  const requested = new Map<string, ReservationRequestLine>();

  for (const line of input.lines) {
    const current = requested.get(line.variantId);
    requested.set(line.variantId, {
      ...line,
      quantity: (current?.quantity ?? 0) + line.quantity,
    });
  }

  if (requested.size === 0) {
    return;
  }

  const variantIds = [...requested.keys()];
  const candidates = await readSlots(tx, variantIds);
  const cellIds = [...new Set(candidates.map((row) => row.cellId))].sort();

  if (cellIds.length > 0) {
    await tx
      .select({ id: warehouseCell.id })
      .from(warehouseCell)
      .where(inArray(warehouseCell.id, cellIds))
      .orderBy(warehouseCell.id)
      .for('update');
  }

  // Re-read under the lock: the first read only discovered which cells to lock.
  const rows = cellIds.length > 0 ? await readSlots(tx, variantIds) : [];
  const reserved = await getReservedByCell(tx, cellIds);
  const allocations: (typeof stockReservation.$inferInsert)[] = [];

  for (const [variantId, line] of requested) {
    const slots: ReservableSlot[] = rows
      .filter((row) => row.variantId === variantId)
      .map((row) => ({
        lotId: row.lotId,
        cellId: row.cellId,
        lotCode: row.lotCode,
        available: Number(row.quantity) - (reserved.get(row.cellId)?.get(row.lotId) ?? 0),
      }));

    const allocation = allocateReservation(slots, line.quantity);

    if (!allocation) {
      throw new AppError('invalid_input', `${line.label}: no hay stock suficiente para apartar`);
    }

    for (const entry of allocation) {
      allocations.push({
        variantId,
        lotId: entry.lotId,
        cellId: entry.cellId,
        quantity: entry.quantity.toString(),
        expiresAt: input.expiresAt,
        orderId: input.orderId,
        createdById: input.createdById,
      });
    }
  }

  await tx.insert(stockReservation).values(allocations);
}

/**
 * Frees every hold of an order, expired or not. Idempotent, so paying or
 * cancelling twice (or an override into `paid`/`cancelled`) cannot fail.
 */
export async function releaseOrderReservations(tx: DbLike, orderId: string): Promise<number> {
  const released = await tx
    .delete(stockReservation)
    .where(eq(stockReservation.orderId, orderId))
    .returning({ id: stockReservation.id });

  return released.length;
}
