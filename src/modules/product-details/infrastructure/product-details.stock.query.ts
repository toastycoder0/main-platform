import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { cellLot, lot, warehouseCell } from '@/infrastructure/db/schema';
import type { VariantStockDTO } from '../application/product-details.types';

/**
 * Sellable stock per product item. Mirrors the warehouse rules: inactive lots
 * and cells cannot be moved, so their quantities are not offered to customers.
 */
export async function getVariantStock(
  ctx: RequestContext,
  itemIds: string[],
): Promise<Map<string, VariantStockDTO>> {
  if (itemIds.length === 0) {
    return new Map();
  }

  const rows = await ctx.db
    .select({
      itemId: lot.itemId,
      lotId: lot.id,
      lotCode: lot.code,
      quantity: sql<string>`COALESCE(SUM(${cellLot.quantity}), 0)`,
    })
    .from(lot)
    .innerJoin(cellLot, eq(cellLot.lotId, lot.id))
    .innerJoin(warehouseCell, eq(warehouseCell.id, cellLot.cellId))
    .where(
      and(inArray(lot.itemId, itemIds), eq(lot.isActive, true), eq(warehouseCell.isActive, true)),
    )
    .groupBy(lot.itemId, lot.id, lot.code)
    .orderBy(asc(lot.code), asc(lot.id));

  const stock = new Map<string, VariantStockDTO>();

  for (const row of rows) {
    const entry = stock.get(row.itemId) ?? { available: 0, lots: [] };
    const quantity = Number(row.quantity);

    entry.available += quantity;

    if (quantity > 0) {
      entry.lots.push({ id: row.lotId, code: row.lotCode, quantity });
    }

    stock.set(row.itemId, entry);
  }

  for (const [itemId, entry] of stock) {
    stock.set(itemId, { ...entry, available: Math.floor(entry.available) });
  }

  return stock;
}
