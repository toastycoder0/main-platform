import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { file, order, user } from '@/infrastructure/db/schema';
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { ManagementOrdersParams } from './orders.params';
import { countManagementOrdersByTray, listManagementOrders } from './orders.query';

const scope = `ordlist${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const ids = {
  manager: '',
  owner: '',
  reviewOrder: '',
  pendingOrder: '',
  paidOrder: '',
};

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
        email: `${userId}@orders.test`,
        firstName: 'Manager',
        lastName: 'Test',
        name: 'Manager Test',
      },
      session: { id: `sess_${userId}`, expiresAt: new Date(Date.now() + 60_000) },
    },
    permissions: new Set(permissions),
    logger,
    requestId: 'itest',
  };
}

function params(overrides: Partial<ManagementOrdersParams> = {}): ManagementOrdersParams {
  return { q: scope, tray: 'all', sort: 'recent', page: 1, pageSize: 10, ...overrides };
}

function orderValues(code: string, status: 'pending' | 'paid', notes: string) {
  return {
    code,
    userId: ids.owner,
    createdById: ids.manager,
    status,
    fulfillmentType: 'warehouse' as const,
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
      type: 'warehouse' as const,
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
    notes,
  };
}

beforeAll(async () => {
  const users = await db
    .insert(user)
    .values([
      { firstName: 'Manager', lastName: 'Test', email: `${scope}-manager@orders.test` },
      { firstName: 'Owner', lastName: 'Test', email: `${scope}-owner@orders.test` },
    ])
    .returning({ id: user.id });

  ids.manager = users[0]?.id ?? '';
  ids.owner = users[1]?.id ?? '';

  const inserted = await db
    .insert(order)
    .values([
      orderValues('PED-20261023-91000001', 'pending', `${scope} review`),
      orderValues('PED-20261023-91000002', 'pending', `${scope} pending`),
      orderValues('PED-20261023-91000003', 'paid', `${scope} prepare`),
    ])
    .returning({ id: order.id, code: order.code });

  ids.reviewOrder = inserted.find((row) => row.code.endsWith('1'))?.id ?? '';
  ids.pendingOrder = inserted.find((row) => row.code.endsWith('2'))?.id ?? '';
  ids.paidOrder = inserted.find((row) => row.code.endsWith('3'))?.id ?? '';

  await db.insert(file).values({
    entity: 'order',
    scope: 'paymentEvidence',
    ownerId: ids.reviewOrder,
    key: `orders/pay-${scope}.pdf`,
  });
});

afterAll(async () => {
  await db.delete(file).where(eq(file.ownerId, ids.reviewOrder));
  await db.delete(order).where(eq(order.userId, ids.owner));
  await db.delete(user).where(inArray(user.id, [ids.manager, ids.owner]));
});

describe('listManagementOrders', () => {
  it('returns nothing without orders.manage', async () => {
    const result = await listManagementOrders(testContext(ids.manager), params());

    expect(result).toEqual({ items: [], total: 0 });
  });

  it('reviews only pending orders that already have payment evidence', async () => {
    const ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);

    const result = await listManagementOrders(ctx, params({ tray: 'review' }));

    expect(result.total).toBe(1);
    expect(result.items[0]?.id).toBe(ids.reviewOrder);
    expect(result.items[0]?.hasPaymentEvidence).toBe(true);
    expect(result.items[0]?.ownerName).toBe('Owner Test');
  });

  it('prepares paid orders', async () => {
    const ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);

    const result = await listManagementOrders(ctx, params({ tray: 'prepare' }));

    expect(result.items.map((item) => item.id)).toEqual([ids.paidOrder]);
  });

  it('keeps pending orders without evidence only in the all tray', async () => {
    const ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);

    const all = await listManagementOrders(ctx, params());
    const review = await listManagementOrders(ctx, params({ tray: 'review' }));

    expect(all.total).toBe(3);
    expect(all.items.some((item) => item.id === ids.pendingOrder)).toBe(true);
    expect(review.items.some((item) => item.id === ids.pendingOrder)).toBe(false);
  });

  it('sorts the oldest first and reports an empty out-of-range page', async () => {
    const ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);

    const firstPage = await listManagementOrders(ctx, params({ sort: 'oldest' }));
    const secondPage = await listManagementOrders(ctx, params({ page: 2 }));

    expect(firstPage.total).toBe(3);
    expect(firstPage.items[0]?.code).toBe('PED-20261023-91000001');
    expect(secondPage.items).toHaveLength(0);
  });
});

describe('countManagementOrdersByTray', () => {
  it('counts each tray for the current search', async () => {
    const ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);

    const counts = await countManagementOrdersByTray(ctx, params());

    expect(counts).toEqual({ review: 1, prepare: 1, completed: 0, cancelled: 0, all: 3 });
  });

  it('returns zero counts without orders.manage', async () => {
    const counts = await countManagementOrdersByTray(testContext(ids.manager), params());

    expect(counts).toEqual({ review: 0, prepare: 0, completed: 0, cancelled: 0, all: 0 });
  });
});
