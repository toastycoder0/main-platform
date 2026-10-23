import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { order, user } from '@/infrastructure/db/schema';
import type { OrdersParams } from './orders.params';
import { getOrder, listOrders } from './orders.query';

const scope = `ordq${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const ids = { owner: '', creator: '', orderId: '' };

const params: OrdersParams = { q: null, status: [], sort: 'recent', page: 1, pageSize: 10 };

function testContext(userId: string): RequestContext {
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
        email: `${userId}@orders.test`,
        firstName: 'Viewer',
        lastName: 'Test',
        name: 'Viewer Test',
      },
      session: { id: `sess_${userId}`, expiresAt: new Date(Date.now() + 60_000) },
    },
    permissions: new Set<string>(),
    logger,
    requestId: 'itest',
  };
}

beforeAll(async () => {
  const users = await db
    .insert(user)
    .values([
      { firstName: 'Owner', lastName: 'Test', email: `${scope}-owner@orders.test` },
      { firstName: 'Creator', lastName: 'Test', email: `${scope}-creator@orders.test` },
    ])
    .returning({ id: user.id });

  ids.owner = users[0]?.id ?? '';
  ids.creator = users[1]?.id ?? '';

  const [row] = await db
    .insert(order)
    .values({
      userId: ids.owner,
      createdById: ids.creator,
      fulfillmentType: 'warehouse',
      billing: {
        owner: { id: ids.owner, name: 'Owner Test', email: `${scope}-owner@orders.test` },
        invoice: {
          businessName: 'Owner S.A. de C.V.',
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

  ids.orderId = row?.id ?? '';
});

afterAll(async () => {
  await db.delete(order).where(inArray(order.userId, [ids.owner, ids.creator]));
  await db.delete(user).where(inArray(user.id, [ids.owner, ids.creator]));
});

describe('order ownership on the buyer surface', () => {
  it('flags an order created for someone else and exposes the owner name', async () => {
    const page = await listOrders(testContext(ids.creator), params);
    const item = page.items.find((entry) => entry.id === ids.orderId);

    expect(item?.ownerName).toBe('Owner Test');
    expect(item?.isOwner).toBe(false);
  });

  it('marks the order as owned when the viewer placed it for themselves', async () => {
    const page = await listOrders(testContext(ids.owner), params);
    const item = page.items.find((entry) => entry.id === ids.orderId);

    expect(item?.ownerName).toBe('Owner Test');
    expect(item?.isOwner).toBe(true);
  });

  it('shows the buyer from the snapshot and the creator from the live user', async () => {
    const order = await getOrder(testContext(ids.creator), ids.orderId);

    expect(order?.billing.owner.name).toBe('Owner Test');
    expect(order?.createdByName).toBe('Creator Test');
    expect(order?.isOwner).toBe(false);
  });

  it('keeps the same creator name for the owner while flagging ownership', async () => {
    const order = await getOrder(testContext(ids.owner), ids.orderId);

    expect(order?.createdByName).toBe('Creator Test');
    expect(order?.isOwner).toBe(true);
  });

  it('hides the order from a user with no relation to it', async () => {
    const outsider = await db
      .insert(user)
      .values({ firstName: 'Out', lastName: 'Sider', email: `${scope}-outsider@orders.test` })
      .returning({ id: user.id });

    const outsiderId = outsider[0]?.id ?? '';

    try {
      const page = await listOrders(testContext(outsiderId), params);

      expect(page.items).toHaveLength(0);
      expect(await getOrder(testContext(outsiderId), ids.orderId)).toBeNull();
    } finally {
      await db.delete(user).where(eq(user.id, outsiderId));
    }
  });
});
