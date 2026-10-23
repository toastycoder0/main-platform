import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { file, order, user } from '@/infrastructure/db/schema';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { getOrderManagement } from './orders.query';

const scope = `ordmg${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const ids = { manager: '', owner: '', orderId: '' };

const createdFileIds: string[] = [];

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

function firstId(rows: { id: string }[]): string {
  const row = rows.at(0);

  if (!row) {
    throw new Error('Seed insert returned no rows');
  }

  return row.id;
}

beforeAll(async () => {
  const users = await db
    .insert(user)
    .values([
      { firstName: 'Manager', lastName: 'Test', email: `${scope}-manager@orders.test` },
      { firstName: 'Ana', lastName: 'Propietaria', email: `${scope}-owner@orders.test` },
    ])
    .returning({ id: user.id });

  ids.manager = users[0]?.id ?? '';
  ids.owner = users[1]?.id ?? '';

  const inserted = await db
    .insert(order)
    .values({
      code: 'PED-20261023-90000003',
      userId: ids.owner,
      createdById: ids.manager,
      fulfillmentType: 'warehouse',
      billing: {
        owner: { id: ids.owner, name: 'Ana Propietaria', email: `${scope}-owner@orders.test` },
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

  ids.orderId = firstId(inserted);

  const files = await db
    .insert(file)
    .values([
      {
        entity: 'order',
        scope: 'paymentEvidence',
        ownerId: ids.orderId,
        key: `orders/pay-${scope}.pdf`,
      },
      {
        entity: 'order',
        scope: 'managementEvidence',
        ownerId: ids.orderId,
        key: `orders/manage-${scope}.pdf`,
      },
    ])
    .returning({ id: file.id });

  createdFileIds.push(...files.map((row) => row.id));
});

afterAll(async () => {
  if (createdFileIds.length > 0) {
    await db.delete(file).where(inArray(file.id, createdFileIds));
  }

  await db.delete(order).where(eq(order.id, ids.orderId));
  await db.delete(user).where(inArray(user.id, [ids.manager, ids.owner]));
});

describe('getOrderManagement', () => {
  it('returns nothing without orders.manage', async () => {
    await expect(getOrderManagement(testContext(ids.owner), ids.orderId)).resolves.toBeNull();
  });

  it('returns nothing for a missing order', async () => {
    const ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);

    await expect(getOrderManagement(ctx, 'ord_missing')).resolves.toBeNull();
  });

  it('adds the live owner, both evidence scopes and the allowed actions', async () => {
    const ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);

    const order = await getOrderManagement(ctx, ids.orderId);

    expect(order).not.toBeNull();
    expect(order?.ownerName).toBe('Ana Propietaria');
    expect(order?.paymentEvidence).toHaveLength(1);
    expect(order?.managementEvidence).toHaveLength(1);
    expect(order?.paymentEvidence[0]?.url).toMatch(/orders\/pay-/);
    expect(order?.managementEvidence[0]?.url).toMatch(/orders\/manage-/);
    expect(order?.availableActions.map((option) => option.action)).toEqual(['markOrderPaid']);
  });
});
