import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { priceList } from '@/infrastructure/db/schema';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { archivePriceList, createPriceList, updatePriceList } from './price-lists.action';

const scope = `upplist${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const state = vi.hoisted(() => ({
  ctx: undefined as RequestContext | undefined,
}));

vi.mock('@/infrastructure/context/next-factory', () => ({
  createRequestContext: () => {
    if (!state.ctx) {
      throw new Error('Test context not set');
    }
    return state.ctx;
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

const createdPriceListIds: string[] = [];

function testContext(): RequestContext {
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
        id: 'user_itest',
        email: `${scope}@price-lists-action.test`,
        firstName: 'PriceLists',
        lastName: 'Action',
        name: 'PriceLists Action',
      },
      session: { id: 'sess_itest', expiresAt: new Date(Date.now() + 60_000) },
    },
    permissions: new Set([
      PERMISSIONS.admin.priceLists.create,
      PERMISSIONS.admin.priceLists.edit,
      PERMISSIONS.admin.priceLists.delete,
    ]),
    logger,
    requestId: 'itest',
  };
}

async function seedPriceList(name: string): Promise<string> {
  const id = `plst_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  await db.insert(priceList).values({
    id,
    slug: `${scope}_${name}`,
    name,
    sortOrder: createdPriceListIds.length,
  });
  createdPriceListIds.push(id);
  return id;
}

beforeEach(() => {
  state.ctx = testContext();
});

afterAll(async () => {
  if (createdPriceListIds.length > 0) {
    await db.delete(priceList).where(inArray(priceList.id, createdPriceListIds));
  }
});

describe('createPriceList', () => {
  it('creates a price list with a slug derived from the name', async () => {
    const name = `${scope} Lista de Mayoreo`;

    const result = await createPriceList({
      name,
      description: 'Precios al mayoreo',
      isDefault: true,
    });
    expect(result.success).toBe(true);

    const rows = await db
      .select({
        id: priceList.id,
        slug: priceList.slug,
        description: priceList.description,
        isDefault: priceList.isDefault,
      })
      .from(priceList)
      .where(eq(priceList.name, name))
      .limit(1);
    const created = rows[0];

    expect(created?.slug).toMatch(new RegExp(`^${scope}-lista-de-mayoreo-[a-f0-9]{6}$`));
    expect(created?.description).toBe('Precios al mayoreo');
    expect(created?.isDefault).toBe(true);
    if (created) {
      createdPriceListIds.push(created.id);
    }
  });

  it('normalizes isDefault to single true value', async () => {
    const nameA = `${scope} Default A`;
    const nameB = `${scope} Default B`;

    const resultA = await createPriceList({ name: nameA, description: null, isDefault: true });
    expect(resultA.success).toBe(true);

    const resultB = await createPriceList({ name: nameB, description: null, isDefault: true });
    expect(resultB.success).toBe(true);

    const rows = await db
      .select({ name: priceList.name, isDefault: priceList.isDefault })
      .from(priceList)
      .where(eq(priceList.name, nameB));
    expect(rows[0]?.isDefault).toBe(true);
  });

  it('rejects creation when the actor lacks the create permission', async () => {
    state.ctx = {
      ...testContext(),
      permissions: new Set([PERMISSIONS.admin.priceLists.edit]),
    };

    const result = await createPriceList({
      name: `${scope} Forbidden`,
      description: null,
      isDefault: false,
    });

    expect(result).toEqual({
      success: false,
      error: 'No tienes permiso para realizar esta acción',
    });
  });

  it('rejects empty names through schema validation', async () => {
    const result = await createPriceList({ name: '   ', description: null, isDefault: false });

    expect(result).toEqual({ success: false, error: 'Datos inválidos' });
  });
});

describe('updatePriceList', () => {
  it('updates price list fields', async () => {
    const id = await seedPriceList('Para Actualizar');

    const result = await updatePriceList({
      id,
      name: `${scope} Renombrada`,
      description: 'Nueva descripción',
      isDefault: true,
    });
    expect(result.success).toBe(true);

    const rows = await db
      .select({
        name: priceList.name,
        description: priceList.description,
        isDefault: priceList.isDefault,
      })
      .from(priceList)
      .where(eq(priceList.id, id))
      .limit(1);
    expect(rows[0]?.name).toBe(`${scope} Renombrada`);
    expect(rows[0]?.description).toBe('Nueva descripción');
    expect(rows[0]?.isDefault).toBe(true);
  });

  it('fails with not_found for a missing price list', async () => {
    const result = await updatePriceList({
      id: 'plst_does_not_exist',
      name: 'Cualquiera',
      description: null,
      isDefault: false,
    });

    expect(result).toEqual({ success: false, error: 'El recurso solicitado no existe' });
  });
});

describe('archivePriceList', () => {
  it('soft deletes the price list', async () => {
    const id = await seedPriceList('Para Archivar');

    const result = await archivePriceList({ id });
    expect(result.success).toBe(true);

    const rows = await db
      .select({ deletedAt: priceList.deletedAt })
      .from(priceList)
      .where(eq(priceList.id, id))
      .limit(1);
    expect(rows[0]?.deletedAt).toBeInstanceOf(Date);
  });

  it('fails with not_found for a missing price list', async () => {
    const result = await archivePriceList({ id: 'plst_does_not_exist' });

    expect(result).toEqual({ success: false, error: 'El recurso solicitado no existe' });
  });
});
