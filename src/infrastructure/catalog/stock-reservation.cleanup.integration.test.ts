import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/infrastructure/db';
import {
  currency,
  lot,
  product,
  productItem,
  productUnit,
  stockReservation,
  user,
  warehouse,
  warehouseCell,
  warehouseNode,
} from '@/infrastructure/db/schema';
import { purgeExpiredReservations } from './stock-reservation.cleanup';

const scope = `rsvclean${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const CURRENCY = scope.toUpperCase();

const ids = {
  user: '',
  unit: '',
  product: '',
  variant: '',
  warehouse: `wh_${scope}`,
  node: `wn_${scope}`,
  cell: `wcel_${scope}`,
  lot: `lot_${scope}`,
};

function firstId(rows: { id: string }[]): string {
  const row = rows.at(0);

  if (!row) {
    throw new Error('Seed insert returned no rows');
  }

  return row.id;
}

function hold(quantity: string, expiresAt: Date) {
  return {
    variantId: ids.variant,
    lotId: ids.lot,
    cellId: ids.cell,
    quantity,
    expiresAt,
    orderId: null,
    createdById: ids.user,
  };
}

beforeAll(async () => {
  await db.insert(currency).values({ code: CURRENCY, name: scope });
  ids.unit = firstId(
    await db
      .insert(productUnit)
      .values({ slug: `${scope}-unit`, name: `${scope} Unit` })
      .returning({ id: productUnit.id }),
  );
  ids.user = firstId(
    await db
      .insert(user)
      .values({ firstName: 'Cleanup', lastName: 'Test', email: `${scope}@reservation.test` })
      .returning({ id: user.id }),
  );
  ids.product = firstId(
    await db
      .insert(product)
      .values({
        slug: scope,
        title: `${scope} cleanup`,
        unitId: ids.unit,
        baseCurrency: CURRENCY,
      })
      .returning({ id: product.id }),
  );
  ids.variant = firstId(
    await db
      .insert(productItem)
      .values({ productId: ids.product, title: 'stocked', code: `${scope}-s` })
      .returning({ id: productItem.id }),
  );

  await db.insert(warehouse).values({ id: ids.warehouse, name: scope });
  await db.insert(warehouseNode).values({
    id: ids.node,
    warehouseId: ids.warehouse,
    name: 'Rack',
    kind: 'rack',
    path: `/${ids.node}/`,
  });
  await db.insert(warehouseCell).values({
    id: ids.cell,
    warehouseId: ids.warehouse,
    nodeId: ids.node,
    code: 'A1',
    position: 1,
  });
  await db.insert(lot).values({
    id: ids.lot,
    itemId: ids.variant,
    code: `${scope}-L1`.toUpperCase(),
    normalizedCode: `${scope}-l1`,
  });
});

beforeEach(async () => {
  await db.delete(stockReservation).where(eq(stockReservation.variantId, ids.variant));
});

afterAll(async () => {
  await db.delete(stockReservation).where(eq(stockReservation.variantId, ids.variant));
  await db.delete(lot).where(eq(lot.id, ids.lot));
  await db.delete(warehouseCell).where(eq(warehouseCell.id, ids.cell));
  await db.delete(warehouseNode).where(eq(warehouseNode.id, ids.node));
  await db.delete(warehouse).where(eq(warehouse.id, ids.warehouse));
  await db.delete(product).where(eq(product.id, ids.product));
  await db.delete(user).where(eq(user.id, ids.user));
  await db.delete(productUnit).where(eq(productUnit.id, ids.unit));
  await db.delete(currency).where(eq(currency.code, CURRENCY));
});

describe('purgeExpiredReservations', () => {
  it('deletes expired holds and keeps active ones', async () => {
    await db
      .insert(stockReservation)
      .values([hold('2', new Date(Date.now() - 60_000)), hold('3', new Date(Date.now() + 60_000))]);

    await expect(purgeExpiredReservations(db)).resolves.toEqual({ deleted: 1 });

    const remaining = await db
      .select({ quantity: stockReservation.quantity })
      .from(stockReservation)
      .where(eq(stockReservation.variantId, ids.variant));

    expect(remaining).toHaveLength(1);
    expect(Number(remaining[0]?.quantity)).toBe(3);
  });

  it('is a no-op when nothing has expired', async () => {
    await db.insert(stockReservation).values(hold('1', new Date(Date.now() + 60_000)));

    await expect(purgeExpiredReservations(db)).resolves.toEqual({ deleted: 0 });
    expect(
      await db.select().from(stockReservation).where(eq(stockReservation.variantId, ids.variant)),
    ).toHaveLength(1);
  });

  it('is idempotent across runs', async () => {
    await db.insert(stockReservation).values(hold('1', new Date(Date.now() - 60_000)));

    await expect(purgeExpiredReservations(db)).resolves.toEqual({ deleted: 1 });
    await expect(purgeExpiredReservations(db)).resolves.toEqual({ deleted: 0 });
  });
});
