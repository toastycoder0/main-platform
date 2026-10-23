import { randomUUID } from 'node:crypto';
import { asc, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { file, order, orderEvent, user } from '@/infrastructure/db/schema';
import { storageKeyToUrl } from '@/infrastructure/storage/urls';
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { OrderStatus } from '../application/orders.types';
import { attachOrderEvidence } from './orders.evidence.action';

const scope = `ordev${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const ids = { owner: '', creator: '', manager: '' };

const createdFileIds: string[] = [];
const createdOrderIds: string[] = [];

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

vi.mock('@/infrastructure/storage/client', () => ({
  storageClient: {
    copyFile: vi.fn(() => Promise.resolve()),
    deleteFile: vi.fn(() => Promise.resolve()),
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
        firstName: 'Evidence',
        lastName: 'Tester',
        name: 'Evidence Tester',
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

let sequence = 0;

function nextCode(): string {
  sequence += 1;
  return `PED-20261023-${String(sequence).padStart(8, '0')}`;
}

async function createOrder(status: OrderStatus, ownerId: string): Promise<string> {
  const inserted = await db
    .insert(order)
    .values({
      code: nextCode(),
      userId: ownerId,
      createdById: ids.manager,
      status,
      fulfillmentType: 'warehouse',
      billing: {
        owner: { id: ownerId, name: 'Owner Test', email: `${scope}@orders.test` },
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

  const orderId = firstId(inserted);
  createdOrderIds.push(orderId);

  return orderId;
}

async function tempFile(actorId: string, fileScope: string): Promise<string> {
  const tempKey = `_temp/${randomUUID()}.pdf`;
  const inserted = await db
    .insert(file)
    .values({
      tempKey,
      createdBy: actorId,
      entity: 'order',
      scope: fileScope,
      ownerId: null,
    })
    .returning({ id: file.id });

  createdFileIds.push(firstId(inserted));

  return tempKey;
}

function orderFiles(orderId: string) {
  return db.select().from(file).where(eq(file.ownerId, orderId)).orderBy(asc(file.sortOrder));
}

function orderEvents(orderId: string) {
  return db
    .select()
    .from(orderEvent)
    .where(eq(orderEvent.orderId, orderId))
    .orderBy(asc(orderEvent.createdAt), asc(orderEvent.id));
}

beforeAll(async () => {
  const users = await db
    .insert(user)
    .values([
      { firstName: 'Owner', lastName: 'Test', email: `${scope}-owner@orders.test` },
      { firstName: 'Creator', lastName: 'Test', email: `${scope}-creator@orders.test` },
      { firstName: 'Manager', lastName: 'Test', email: `${scope}-manager@orders.test` },
    ])
    .returning({ id: user.id });

  ids.owner = users[0]?.id ?? '';
  ids.creator = users[1]?.id ?? '';
  ids.manager = users[2]?.id ?? '';
});

afterAll(async () => {
  if (createdFileIds.length > 0) {
    await db.delete(file).where(inArray(file.id, createdFileIds));
  }

  if (createdOrderIds.length > 0) {
    await db.delete(order).where(inArray(order.id, createdOrderIds));
  }

  await db.delete(user).where(inArray(user.id, [ids.owner, ids.creator, ids.manager]));
});

describe('attachOrderEvidence', () => {
  it('lets the owner upload the payment proof while pending', async () => {
    const orderId = await createOrder('pending', ids.owner);
    const tempKey = await tempFile(ids.owner, 'paymentEvidence');
    state.ctx = testContext(ids.owner);

    const result = await attachOrderEvidence({
      orderId,
      scope: 'paymentEvidence',
      refs: [tempKey],
    });

    expect(result.success).toBe(true);

    const files = await orderFiles(orderId);
    expect(files).toHaveLength(1);
    expect(files[0]?.key).toMatch(/^orders\/evidence\/payment\//);

    const events = await orderEvents(orderId);
    expect(events.map((event) => event.action)).toEqual(['evidence_added']);
    expect(events[0]?.metadata).toEqual({ scope: 'paymentEvidence', count: 1 });
  });

  it('rejects the owner once the order left pending', async () => {
    const orderId = await createOrder('paid', ids.owner);
    const tempKey = await tempFile(ids.owner, 'paymentEvidence');
    state.ctx = testContext(ids.owner);

    const result = await attachOrderEvidence({
      orderId,
      scope: 'paymentEvidence',
      refs: [tempKey],
    });

    expect(result.success).toBe(false);
    await expect(orderFiles(orderId)).resolves.toHaveLength(0);
  });

  it('rejects the creator who bought on behalf of the owner', async () => {
    const orderId = await createOrder('pending', ids.owner);
    const tempKey = await tempFile(ids.creator, 'paymentEvidence');
    state.ctx = testContext(ids.creator);

    const result = await attachOrderEvidence({
      orderId,
      scope: 'paymentEvidence',
      refs: [tempKey],
    });

    expect(result.success).toBe(false);
  });

  it('lets a manager attach management evidence in any state', async () => {
    const orderId = await createOrder('paid', ids.owner);
    const tempKey = await tempFile(ids.manager, 'managementEvidence');
    state.ctx = testContext(ids.manager, [PERMISSIONS.orders.manage]);

    const result = await attachOrderEvidence({
      orderId,
      scope: 'managementEvidence',
      refs: [tempKey],
    });

    expect(result.success).toBe(true);
    await expect(orderFiles(orderId)).resolves.toHaveLength(1);
  });

  it('replaces the collection and logs the removal', async () => {
    const orderId = await createOrder('pending', ids.owner);
    state.ctx = testContext(ids.owner);
    const first = await tempFile(ids.owner, 'paymentEvidence');
    const second = await tempFile(ids.owner, 'paymentEvidence');

    await attachOrderEvidence({ orderId, scope: 'paymentEvidence', refs: [first, second] });

    const [kept] = await orderFiles(orderId);

    if (!kept?.key) {
      throw new Error('Expected a persisted evidence file');
    }

    const result = await attachOrderEvidence({
      orderId,
      scope: 'paymentEvidence',
      refs: [storageKeyToUrl(kept.key)],
    });

    expect(result.success).toBe(true);
    await expect(orderFiles(orderId)).resolves.toHaveLength(1);

    const events = await orderEvents(orderId);
    expect(events.map((event) => event.action)).toEqual(['evidence_added', 'evidence_removed']);
    expect(events[1]?.metadata).toEqual({ scope: 'paymentEvidence', count: 1 });
  });

  it('clears the scope when the list is empty', async () => {
    const orderId = await createOrder('pending', ids.owner);
    const tempKey = await tempFile(ids.owner, 'paymentEvidence');
    state.ctx = testContext(ids.owner);

    await attachOrderEvidence({ orderId, scope: 'paymentEvidence', refs: [tempKey] });
    const result = await attachOrderEvidence({ orderId, scope: 'paymentEvidence', refs: [] });

    expect(result.success).toBe(true);
    await expect(orderFiles(orderId)).resolves.toHaveLength(0);

    const events = await orderEvents(orderId);
    expect(events.map((event) => event.action)).toEqual(['evidence_added', 'evidence_removed']);
  });
});
