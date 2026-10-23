import { asc, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { order, orderEvent, user } from '@/infrastructure/db/schema';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { addOrderNote } from './orders.notes.action';
import { listOrderNotes } from './orders.notes.query';

const scope = `ordn${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const ids = { manager: '', owner: '', orderId: '' };

const state = vi.hoisted(() => ({ ctx: undefined as RequestContext | undefined }));

vi.mock('@/infrastructure/context/next-factory', () => ({
  createRequestContext: () => {
    if (!state.ctx) {
      throw new Error('Test context not set');
    }
    return state.ctx;
  },
}));

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
      { firstName: 'Owner', lastName: 'Test', email: `${scope}-owner@orders.test` },
    ])
    .returning({ id: user.id });

  ids.manager = users[0]?.id ?? '';
  ids.owner = users[1]?.id ?? '';

  const inserted = await db
    .insert(order)
    .values({
      code: 'PED-20261023-90000001',
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
});

afterAll(async () => {
  await db.delete(order).where(eq(order.id, ids.orderId));
  await db.delete(user).where(inArray(user.id, [ids.manager, ids.owner]));
});

function events() {
  return db
    .select()
    .from(orderEvent)
    .where(eq(orderEvent.orderId, ids.orderId))
    .orderBy(asc(orderEvent.createdAt), asc(orderEvent.id));
}

describe('addOrderNote', () => {
  it('rejects a session without orders.manage', async () => {
    state.ctx = testContext(ids.manager);

    const result = await addOrderNote({ orderId: ids.orderId, body: 'Contactar al cliente' });

    expect(result.success).toBe(false);
    await expect(events()).resolves.toHaveLength(0);
  });

  it('rejects a missing order', async () => {
    state.ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);

    const result = await addOrderNote({ orderId: 'ord_missing', body: 'Contactar al cliente' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toMatch(/no existe/);
    }
  });

  it('appends the note as an internal event', async () => {
    state.ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);

    const result = await addOrderNote({
      orderId: ids.orderId,
      body: 'El cliente confirmó la entrega por teléfono',
    });

    expect(result.success).toBe(true);

    const [event] = await events();
    expect(event).toMatchObject({
      action: 'note_added',
      fromStatus: null,
      toStatus: null,
      reason: null,
      actorId: ids.manager,
      metadata: {
        body: 'El cliente confirmó la entrega por teléfono',
        visibility: 'internal',
      },
    });
  });
});

describe('listOrderNotes', () => {
  it('returns only notes, ordered and with the author name', async () => {
    state.ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);
    await addOrderNote({ orderId: ids.orderId, body: 'Segunda nota' });

    await db.insert(orderEvent).values({
      orderId: ids.orderId,
      action: 'evidence_added',
      actorId: ids.manager,
      metadata: { scope: 'paymentEvidence', count: 1 },
    });

    const notes = await listOrderNotes(state.ctx, ids.orderId);

    expect(notes.map((note) => note.body)).toEqual([
      'El cliente confirmó la entrega por teléfono',
      'Segunda nota',
    ]);
    expect(notes.every((note) => note.authorName === 'Manager Test')).toBe(true);
  });
});
