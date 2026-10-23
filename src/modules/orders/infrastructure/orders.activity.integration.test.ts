import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { order, orderEvent, user } from '@/infrastructure/db/schema';
import { listOrderActivity } from './orders.activity.query';

const scope = `ordact${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const ids = { manager: '', owner: '', orderId: '' };

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
        firstName: 'Manager',
        lastName: 'Test',
        name: 'Manager Test',
      },
      session: { id: `sess_${userId}`, expiresAt: new Date(Date.now() + 60_000) },
    },
    permissions: new Set<string>(),
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
      { firstName: 'Owner', lastName: 'Test', email: `${scope}-owner@orders.test` },
    ])
    .returning({ id: user.id });

  ids.manager = users[0]?.id ?? '';
  ids.owner = users[1]?.id ?? '';

  const inserted = await db
    .insert(order)
    .values({
      code: 'PED-20261023-90000002',
      userId: ids.owner,
      createdById: ids.manager,
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

  ids.orderId = firstId(inserted);

  await db.insert(orderEvent).values([
    {
      orderId: ids.orderId,
      action: 'note_added',
      actorId: ids.manager,
      metadata: { body: 'Nota interna', visibility: 'internal' },
      createdAt: new Date('2026-10-02T09:00:00Z'),
    },
    {
      orderId: ids.orderId,
      action: 'markOrderPaid',
      fromStatus: 'pending',
      toStatus: 'paid',
      actorId: ids.manager,
      createdAt: new Date('2026-10-01T09:00:00Z'),
    },
    {
      orderId: ids.orderId,
      action: 'overrideOrderStatus',
      fromStatus: 'paid',
      toStatus: 'cancelled',
      actorId: ids.manager,
      reason: 'Pedido duplicado',
      createdAt: new Date('2026-10-03T09:00:00Z'),
    },
  ]);
});

afterAll(async () => {
  await db.delete(order).where(eq(order.id, ids.orderId));
  await db.delete(user).where(inArray(user.id, [ids.manager, ids.owner]));
});

describe('listOrderActivity', () => {
  it('returns every event chronologically with the actor name', async () => {
    const entries = await listOrderActivity(testContext(ids.manager), ids.orderId);

    expect(entries.map((entry) => entry.action)).toEqual([
      'markOrderPaid',
      'note_added',
      'overrideOrderStatus',
    ]);
    expect(entries.map((entry) => entry.label)).toEqual([
      'Marcado como pagado',
      'Nota interna',
      'Estado cambiado (excepción)',
    ]);
    expect(entries.every((entry) => entry.actorName === 'Manager Test')).toBe(true);
    expect(entries[2]?.reason).toBe('Pedido duplicado');
  });
});
