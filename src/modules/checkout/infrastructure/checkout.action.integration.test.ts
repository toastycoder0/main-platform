import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getVariantStock } from '@/infrastructure/catalog/catalog.stock.query';
import { reserveStock } from '@/infrastructure/catalog/stock-reservation.repository';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import {
  cart,
  cellLot,
  currency,
  lot,
  order,
  orderItem,
  priceList,
  product,
  productItem,
  productPrice,
  productUnit,
  stockReservation,
  user,
  warehouse,
  warehouseCell,
  warehouseNode,
} from '@/infrastructure/db/schema';
import { addToCart } from '@/modules/cart/infrastructure/cart.action';
import { MovementRejectedError } from '@/modules/warehouse/application/warehouse.errors';
import { executeMovement } from '@/modules/warehouse/infrastructure/warehouse.engine';
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { ReservationHours } from '../application/checkout.constants';
import type {
  CheckoutBillingInput,
  CheckoutDeliveryInput,
} from '../application/checkout.validation';
import { placeOrder, saveCheckoutBilling, saveCheckoutDelivery } from './checkout.action';
import { getCheckoutState } from './checkout.query';
import { checkoutVersion } from './checkout.version';

const scope = `chk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const CURRENCY = scope.toUpperCase();

const state = vi.hoisted(() => ({ ctx: undefined as RequestContext | undefined }));

vi.mock('@/infrastructure/context/next-factory', () => ({
  createRequestContext: () => {
    if (!state.ctx) {
      throw new Error('Test context not set');
    }
    return state.ctx;
  },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const ids = {
  buyer: '',
  other: '',
  priceListId: '',
  unit: '',
  productId: '',
  variant: '',
  warehouse: `wh_${scope}`,
  node: `wn_${scope}`,
  cell: `wcel_${scope}`,
  lot: `lot_${scope}`,
};

const STOCK = 10;
const slug = `${scope}-checkout`;

function testContext(userId: string, permissions: string[] = []): RequestContext {
  const logger: RequestContext['logger'] = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => logger,
  };

  return {
    db,
    session: {
      user: {
        id: userId,
        email: `${scope}@checkout.test`,
        firstName: 'Checkout',
        lastName: 'Tester',
        name: 'Checkout Tester',
      },
      session: { id: `sess_${scope}`, expiresAt: new Date(Date.now() + 60_000) },
    },
    permissions: new Set(permissions),
    logger,
    requestId: 'itest',
  };
}

function firstId(rows: { id: string }[]): string {
  const row = rows.at(0);
  if (!row) {
    throw new Error('Seed insert returned no rows');
  }
  return row.id;
}

function billing(userId: string): CheckoutBillingInput {
  return {
    userId,
    invoice: {
      businessName: 'Empresa S.A. de C.V.',
      rfc: 'EMP010101AAA',
      zipCode: '06000',
      taxRegimen: '601',
      cfdiUse: 'G03',
      rfcKey: '',
    },
  };
}

function delivery(reservationHours: ReservationHours | null): CheckoutDeliveryInput {
  return {
    type: 'warehouse',
    notes: 'Llamar antes',
    reservationHours,
    warehouse: {
      office: 'Tezoyuca',
      licensePlate: 'ABC123',
      vehicle: 'Camioneta',
      driver: 'Juan Pérez',
      dateOfRecolection: '2030-01-15',
    },
  };
}

async function expectRedirect(attempt: Promise<unknown>, path: string): Promise<void> {
  await expect(attempt).rejects.toMatchObject({
    digest: expect.stringContaining(`;${path}`),
  });
}

async function availableStock(): Promise<number> {
  const stock = await getVariantStock(testContext(ids.buyer), [ids.variant]);
  return stock.get(ids.variant)?.available ?? 0;
}

async function fillCart(quantity: number): Promise<void> {
  const result = await addToCart({
    lines: [{ productSlug: slug, variantId: ids.variant, quantity, fields: {} }],
  });
  expect(result.success).toBe(true);
}

beforeAll(async () => {
  await db.insert(currency).values({ code: CURRENCY, name: scope });
  ids.unit = firstId(
    await db
      .insert(productUnit)
      .values({ slug: `${scope}-unit`, name: `${scope} Unit` })
      .returning({ id: productUnit.id }),
  );
  ids.priceListId = firstId(
    await db
      .insert(priceList)
      .values({ slug: `${scope}-pl`, name: `${scope} PL` })
      .returning({ id: priceList.id }),
  );
  ids.buyer = firstId(
    await db
      .insert(user)
      .values({
        firstName: 'Buyer',
        lastName: 'Test',
        email: `${scope}-buyer@checkout.test`,
        priceListId: ids.priceListId,
      })
      .returning({ id: user.id }),
  );
  ids.other = firstId(
    await db
      .insert(user)
      .values({ firstName: 'Other', lastName: 'Test', email: `${scope}-other@checkout.test` })
      .returning({ id: user.id }),
  );
  ids.productId = firstId(
    await db
      .insert(product)
      .values({
        slug,
        title: `${scope} checkout`,
        unitId: ids.unit,
        baseCurrency: CURRENCY,
        taxName: 'IVA',
        taxRate: '16',
      })
      .returning({ id: product.id }),
  );
  ids.variant = firstId(
    await db
      .insert(productItem)
      .values({ productId: ids.productId, title: 'stocked', code: `${scope}-s` })
      .returning({ id: productItem.id }),
  );
  await db
    .insert(productPrice)
    .values({ productId: ids.productId, priceListId: ids.priceListId, amount: '50' });

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

afterAll(async () => {
  await db.delete(stockReservation).where(eq(stockReservation.variantId, ids.variant));
  await db.delete(order).where(inArray(order.userId, [ids.buyer, ids.other]));
  await db.delete(cart).where(inArray(cart.userId, [ids.buyer, ids.other]));
  await db.delete(cellLot).where(eq(cellLot.cellId, ids.cell));
  await db.delete(lot).where(eq(lot.id, ids.lot));
  await db.delete(warehouseCell).where(eq(warehouseCell.id, ids.cell));
  await db.delete(warehouseNode).where(eq(warehouseNode.id, ids.node));
  await db.delete(warehouse).where(eq(warehouse.id, ids.warehouse));
  await db.delete(product).where(eq(product.id, ids.productId));
  await db.delete(user).where(inArray(user.id, [ids.buyer, ids.other]));
  await db.delete(priceList).where(eq(priceList.id, ids.priceListId));
  await db.delete(productUnit).where(eq(productUnit.id, ids.unit));
  await db.delete(currency).where(eq(currency.code, CURRENCY));
});

beforeEach(async () => {
  await db.delete(stockReservation).where(eq(stockReservation.variantId, ids.variant));
  await db.delete(order).where(inArray(order.userId, [ids.buyer, ids.other]));
  await db.delete(cart).where(inArray(cart.userId, [ids.buyer, ids.other]));
  await db.delete(cellLot).where(eq(cellLot.cellId, ids.cell));
  await db.insert(cellLot).values({ cellId: ids.cell, lotId: ids.lot, quantity: String(STOCK) });
  state.ctx = testContext(ids.buyer);
});

describe('saveCheckoutBilling', () => {
  it('rejects an empty cart', async () => {
    const result = await saveCheckoutBilling(billing(ids.buyer));

    expect(result.success).toBe(false);
  });

  it('saves the draft and moves to the delivery step', async () => {
    await fillCart(2);

    await expectRedirect(saveCheckoutBilling(billing(ids.buyer)), '/cart/delivery');

    const checkout = await getCheckoutState(testContext(ids.buyer));
    expect(checkout.billing?.invoice.rfc).toBe('EMP010101AAA');
    expect(checkout.furthestStep).toBe('delivery');
  });

  it('requires a permission to order for another user', async () => {
    await fillCart(2);

    const result = await saveCheckoutBilling(billing(ids.other));
    expect(result.success).toBe(false);

    state.ctx = testContext(ids.buyer, [PERMISSIONS.orders.createForOther]);
    await expectRedirect(saveCheckoutBilling(billing(ids.other)), '/cart/delivery');
  });
});

describe('saveCheckoutDelivery', () => {
  beforeEach(async () => {
    await fillCart(4);
    await expectRedirect(saveCheckoutBilling(billing(ids.buyer)), '/cart/delivery');
  });

  it('checks the reservation permissions', async () => {
    expect((await saveCheckoutDelivery(delivery(24))).success).toBe(false);

    state.ctx = testContext(ids.buyer, [PERMISSIONS.orders.reserve]);
    expect((await saveCheckoutDelivery(delivery(4))).success).toBe(false);
    await expectRedirect(saveCheckoutDelivery(delivery(24)), '/cart/review');

    state.ctx = testContext(ids.buyer, [
      PERMISSIONS.orders.reserve,
      PERMISSIONS.orders.reserveDuration,
    ]);
    await expectRedirect(saveCheckoutDelivery(delivery(4)), '/cart/review');
  });

  it('rejects home delivery under the minimum subtotal', async () => {
    const result = await saveCheckoutDelivery({
      type: 'home',
      notes: '',
      reservationHours: null,
      home: {
        street: 'Av. Reforma 123',
        colony: 'Centro',
        municipality: 'Cuauhtémoc',
        state: 'Ciudad de México',
        postalCode: '06000',
        contact: 'Ana López',
        phone: '5512345678',
      },
    });

    expect(result.success).toBe(false);
  });
});

describe('placeOrder', () => {
  const reserver = () =>
    testContext(ids.buyer, [PERMISSIONS.orders.reserve, PERMISSIONS.orders.reserveDuration]);

  beforeEach(async () => {
    state.ctx = reserver();
    await fillCart(4);
    await expectRedirect(saveCheckoutBilling(billing(ids.buyer)), '/cart/delivery');
    await expectRedirect(saveCheckoutDelivery(delivery(8)), '/cart/review');
  });

  it('rejects a stale review', async () => {
    const result = await placeOrder({ version: 'a'.repeat(64) });

    expect(result.success).toBe(false);
  });

  it('creates the order, reserves the stock and empties the cart', async () => {
    const version = checkoutVersion(await getCheckoutState(reserver()));

    await expectRedirect(placeOrder({ version }), '/orders/ord_');

    const [created] = await db.select().from(order).where(eq(order.userId, ids.buyer));
    expect(created?.status).toBe('pending');
    expect(created?.fulfillmentType).toBe('warehouse');
    expect(created?.notes).toBe('Llamar antes');

    const items = await db
      .select()
      .from(orderItem)
      .where(eq(orderItem.orderId, created?.id ?? ''));
    expect(items).toHaveLength(1);
    expect(items[0]?.quantity).toBe(4);

    const reservations = await db
      .select()
      .from(stockReservation)
      .where(eq(stockReservation.variantId, ids.variant));
    expect(reservations).toHaveLength(1);
    expect(Number(reservations[0]?.quantity)).toBe(4);
    expect(reservations[0]?.orderId).toBe(created?.id);
    expect(await availableStock()).toBe(STOCK - 4);

    const checkout = await getCheckoutState(reserver());
    expect(checkout.cart.lines).toHaveLength(0);
    expect(checkout.billing).toBeNull();
    expect(checkout.delivery).toBeNull();
  });

  it('cannot be confirmed twice', async () => {
    const version = checkoutVersion(await getCheckoutState(reserver()));

    await expectRedirect(placeOrder({ version }), '/orders/ord_');
    const second = await placeOrder({ version });

    expect(second.success).toBe(false);
    expect(await db.select().from(order).where(eq(order.userId, ids.buyer))).toHaveLength(1);
  });
});

describe('stock reservations', () => {
  const hold = (quantity: number, expiresAt = new Date(Date.now() + 60_000)) =>
    db.transaction((tx) =>
      reserveStock(tx, {
        lines: [{ variantId: ids.variant, quantity, label: 'Producto' }],
        expiresAt,
        orderId: null,
        createdById: ids.buyer,
      }),
    );

  it('stops counting once expired', async () => {
    await hold(3, new Date(Date.now() - 1000));

    expect(await availableStock()).toBe(STOCK);
  });

  it('keeps reserved quantities inside the cell', async () => {
    await hold(6);

    const attempt = db.transaction((tx) =>
      executeMovement(tx, {
        userId: ids.buyer,
        kind: { type: 'out', reason: 'material_out' },
        entries: [{ lotId: ids.lot, originCellId: ids.cell, destinationCellId: null, quantity: 5 }],
      }),
    );

    await expect(attempt).rejects.toBeInstanceOf(MovementRejectedError);
  });

  it('never holds more than the available stock under concurrency', async () => {
    const results = await Promise.allSettled([hold(6), hold(6)]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await availableStock()).toBe(STOCK - 6);
  });
});
