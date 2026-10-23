import { asc, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import {
  currency,
  lot,
  order,
  orderEvent,
  product,
  productItem,
  productUnit,
  stockReservation,
  user,
  warehouse,
  warehouseCell,
  warehouseNode,
} from '@/infrastructure/db/schema';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { cancelOrder, completeOrder, markOrderPaid, overrideOrderStatus } from './orders.action';

const scope = `ordt${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const CURRENCY = scope.toUpperCase();

const ids = {
  manager: '',
  unit: '',
  product: '',
  variant: '',
  warehouse: `wh_${scope}`,
  node: `wn_${scope}`,
  cell: `wcel_${scope}`,
  lot: `lot_${scope}`,
};

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
        email: `${scope}@orders.test`,
        firstName: 'Manager',
        lastName: 'Test',
        name: 'Manager Test',
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

let sequence = 0;

/** Codes must satisfy `order_code_format`; the counter keeps them unique. */
function nextCode(): string {
  sequence += 1;
  return `PED-20261023-${String(sequence).padStart(8, '0')}`;
}

async function createOrder(status: 'pending' | 'paid' = 'pending'): Promise<string> {
  const inserted = await db
    .insert(order)
    .values({
      code: nextCode(),
      userId: ids.manager,
      createdById: ids.manager,
      status,
      fulfillmentType: 'warehouse',
      billing: {
        owner: { id: ids.manager, name: 'Manager Test', email: `${scope}@orders.test` },
        invoice: {
          businessName: 'Manager S.A. de C.V.',
          rfc: 'ABC010101AAA',
          zipCode: '06000',
          taxRegimen: '601',
          cfdiUse: 'G03',
        },
      },
      fulfillment: {
        type: 'warehouse',
        pickup: {
          office: 'Tezoyuca',
          licensePlate: 'ABC123',
          vehicle: 'Camioneta',
          driver: 'Juan Pérez',
          dateOfRecolection: '2030-01-15',
        },
      },
      subtotals: [],
      taxes: [],
      totals: [{ currency: 'MXN', amount: 1000 }],
    })
    .returning({ id: order.id });

  return firstId(inserted);
}

function hold(orderId: string, expiresAt: Date) {
  return {
    variantId: ids.variant,
    lotId: ids.lot,
    cellId: ids.cell,
    quantity: '2',
    expiresAt,
    orderId,
    createdById: ids.manager,
  };
}

async function orderStatus(orderId: string) {
  const [row] = await db
    .select({ status: order.status })
    .from(order)
    .where(eq(order.id, orderId))
    .limit(1);

  return row?.status ?? null;
}

function events(orderId: string) {
  return db
    .select()
    .from(orderEvent)
    .where(eq(orderEvent.orderId, orderId))
    .orderBy(asc(orderEvent.createdAt), asc(orderEvent.id));
}

function holds(orderId: string) {
  return db.select().from(stockReservation).where(eq(stockReservation.orderId, orderId));
}

beforeAll(async () => {
  await db.insert(currency).values({ code: CURRENCY, name: scope });
  ids.unit = firstId(
    await db
      .insert(productUnit)
      .values({ slug: `${scope}-unit`, name: `${scope} Unit` })
      .returning({ id: productUnit.id }),
  );
  ids.manager = firstId(
    await db
      .insert(user)
      .values({ firstName: 'Manager', lastName: 'Test', email: `${scope}@orders.test` })
      .returning({ id: user.id }),
  );
  ids.product = firstId(
    await db
      .insert(product)
      .values({
        slug: scope,
        title: `${scope} transition`,
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

afterAll(async () => {
  await db.delete(stockReservation).where(eq(stockReservation.variantId, ids.variant));
  await db.delete(order).where(eq(order.userId, ids.manager));
  await db.delete(lot).where(eq(lot.id, ids.lot));
  await db.delete(warehouseCell).where(eq(warehouseCell.id, ids.cell));
  await db.delete(warehouseNode).where(eq(warehouseNode.id, ids.node));
  await db.delete(warehouse).where(eq(warehouse.id, ids.warehouse));
  await db.delete(product).where(eq(product.id, ids.product));
  await db.delete(user).where(inArray(user.id, [ids.manager]));
  await db.delete(productUnit).where(eq(productUnit.id, ids.unit));
  await db.delete(currency).where(eq(currency.code, CURRENCY));
});

describe('applyTransition through the named actions', () => {
  it('RN-06: markOrderPaid moves pending to paid and appends the event', async () => {
    const orderId = await createOrder();
    state.ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);

    const result = await markOrderPaid({ orderId });

    expect(result.success).toBe(true);
    await expect(orderStatus(orderId)).resolves.toBe('paid');

    const [event] = await events(orderId);
    expect(event).toMatchObject({
      action: 'markOrderPaid',
      fromStatus: 'pending',
      toStatus: 'paid',
      actorId: ids.manager,
    });
  });

  it('RN-10: repeating the action over the current state is rejected without a new event', async () => {
    const orderId = await createOrder('paid');
    state.ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);

    const result = await markOrderPaid({ orderId });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toMatch(/ya está en ese estado/);
    }

    await expect(events(orderId)).resolves.toHaveLength(0);
  });

  it('RN-10: an action that no longer fits the stored state fails as stale data', async () => {
    const orderId = await createOrder('pending');
    state.ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);

    const result = await completeOrder({ orderId });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toMatch(/cambió/);
    }
  });

  it('RN-06: refuses to pay an order whose hold already expired', async () => {
    const orderId = await createOrder();
    await db.insert(stockReservation).values(hold(orderId, new Date(Date.now() - 60_000)));
    state.ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);

    const result = await markOrderPaid({ orderId });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toMatch(/apartado/i);
    }

    await expect(orderStatus(orderId)).resolves.toBe('pending');
    await expect(holds(orderId)).resolves.toHaveLength(1);
  });

  it('RN-06: paying releases the active holds of the order', async () => {
    const orderId = await createOrder();
    await db.insert(stockReservation).values(hold(orderId, new Date(Date.now() + 60_000)));
    state.ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);

    const result = await markOrderPaid({ orderId });

    expect(result.success).toBe(true);
    await expect(holds(orderId)).resolves.toHaveLength(0);
  });

  it('RN-07: completeOrder is only allowed once the order is paid', async () => {
    const orderId = await createOrder('paid');
    state.ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);

    const result = await completeOrder({ orderId });

    expect(result.success).toBe(true);
    await expect(orderStatus(orderId)).resolves.toBe('completed');
  });

  it('RN-08: cancelling requires orders.cancel and frees stock', async () => {
    const orderId = await createOrder();
    await db.insert(stockReservation).values(hold(orderId, new Date(Date.now() + 60_000)));

    state.ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);
    const forbidden = await cancelOrder({ orderId, reason: 'Cliente lo pidió' });
    expect(forbidden.success).toBe(false);

    state.ctx = testContext(ids.manager, [PERMISSIONS.orders.cancel]);
    const cancelled = await cancelOrder({ orderId, reason: 'Cliente lo pidió' });

    expect(cancelled.success).toBe(true);
    await expect(orderStatus(orderId)).resolves.toBe('cancelled');
    await expect(holds(orderId)).resolves.toHaveLength(0);

    const [event] = await events(orderId);
    expect(event).toMatchObject({
      action: 'cancelOrder',
      fromStatus: 'pending',
      toStatus: 'cancelled',
      reason: 'Cliente lo pidió',
    });
  });

  it('RN-09: the override needs a reason', async () => {
    const orderId = await createOrder();
    state.ctx = testContext(ids.manager, [PERMISSIONS.orders.status.override]);

    const result = await overrideOrderStatus({ orderId, status: 'completed', reason: 'corto' });

    expect(result.success).toBe(false);
    await expect(orderStatus(orderId)).resolves.toBe('pending');
  });

  it('RN-09: overriding into cancelled records the reason and releases stock', async () => {
    const orderId = await createOrder();
    await db.insert(stockReservation).values(hold(orderId, new Date(Date.now() + 60_000)));
    state.ctx = testContext(ids.manager, [PERMISSIONS.orders.status.override]);

    const result = await overrideOrderStatus({
      orderId,
      status: 'cancelled',
      reason: 'Pedido duplicado por error del sistema',
    });

    expect(result.success).toBe(true);
    await expect(orderStatus(orderId)).resolves.toBe('cancelled');
    await expect(holds(orderId)).resolves.toHaveLength(0);

    const [event] = await events(orderId);
    expect(event).toMatchObject({
      action: 'overrideOrderStatus',
      fromStatus: 'pending',
      toStatus: 'cancelled',
      reason: 'Pedido duplicado por error del sistema',
    });
  });
});
