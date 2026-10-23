import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { order, user } from '@/infrastructure/db/schema';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { reorderOrder } from './orders.action';

const scope = `orda${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const ids = { owner: '', creator: '', orderId: '' };

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
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

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
        firstName: 'Viewer',
        lastName: 'Test',
        name: 'Viewer Test',
      },
      session: { id: `sess_${userId}`, expiresAt: new Date(Date.now() + 60_000) },
    },
    permissions: new Set(permissions),
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

describe('reorderOrder ownership guard', () => {
  it('rejects the creator who bought on behalf of the owner', async () => {
    state.ctx = testContext(ids.creator);

    const result = await reorderOrder({ orderId: ids.orderId });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toMatch(/propietario/);
    }
  });

  it('rejects a manager, because reordering always fills the caller cart', async () => {
    state.ctx = testContext(ids.creator, [PERMISSIONS.admin.access]);

    const result = await reorderOrder({ orderId: ids.orderId });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toMatch(/propietario/);
    }
  });

  it('lets the owner through the ownership guard', async () => {
    state.ctx = testContext(ids.owner);

    const result = await reorderOrder({ orderId: ids.orderId });

    // The fixture has no items, so the next check is the empty order, not ownership.
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).not.toMatch(/propietario/);
    }
  });
});
