import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { productUnit } from '@/infrastructure/db/schema';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { archiveProductUnit, createProductUnit, updateProductUnit } from './product-units.action';

const scope = `updunit${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

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

const createdUnitIds: string[] = [];

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
        email: `${scope}@units-action.test`,
        firstName: 'Units',
        lastName: 'Action',
        name: 'Units Action',
      },
      session: { id: 'sess_itest', expiresAt: new Date(Date.now() + 60_000) },
    },
    permissions: new Set([
      PERMISSIONS.admin.productUnits.create,
      PERMISSIONS.admin.productUnits.edit,
      PERMISSIONS.admin.productUnits.delete,
    ]),
    logger,
    requestId: 'itest',
  };
}

async function seedUnit(name: string): Promise<string> {
  const id = `unit_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  await db.insert(productUnit).values({
    id,
    slug: `${scope}_${name}`,
    name,
    sortOrder: createdUnitIds.length,
  });
  createdUnitIds.push(id);
  return id;
}

beforeEach(() => {
  state.ctx = testContext();
});

afterAll(async () => {
  if (createdUnitIds.length > 0) {
    await db.delete(productUnit).where(inArray(productUnit.id, createdUnitIds));
  }
});

describe('createProductUnit', () => {
  it('creates a unit with a slug derived from the name', async () => {
    const name = `${scope} Metro Cuadrado`;

    const result = await createProductUnit({
      name,
      abbreviation: 'm2',
      taxCode: 'MTR',
      isActive: true,
    });
    expect(result.success).toBe(true);

    const rows = await db
      .select({
        id: productUnit.id,
        slug: productUnit.slug,
        abbreviation: productUnit.abbreviation,
        taxCode: productUnit.taxCode,
      })
      .from(productUnit)
      .where(eq(productUnit.name, name))
      .limit(1);
    const created = rows[0];

    expect(created?.slug).toMatch(new RegExp(`^${scope}-metro-cuadrado-[a-f0-9]{6}$`));
    expect(created?.abbreviation).toBe('m2');
    expect(created?.taxCode).toBe('MTR');
    if (created) {
      createdUnitIds.push(created.id);
    }
  });

  it('rejects creation when the actor lacks the create permission', async () => {
    state.ctx = {
      ...testContext(),
      permissions: new Set([PERMISSIONS.admin.productUnits.edit]),
    };

    const result = await createProductUnit({
      name: `${scope} Forbidden`,
      isActive: true,
    });

    expect(result).toEqual({
      success: false,
      error: 'No tienes permiso para realizar esta acción',
    });
  });

  it('rejects empty names through schema validation', async () => {
    const result = await createProductUnit({ name: '   ', isActive: true });

    expect(result).toEqual({ success: false, error: 'Datos inválidos' });
  });
});

describe('updateProductUnit', () => {
  it('updates unit fields', async () => {
    const id = await seedUnit('Para Actualizar');

    const result = await updateProductUnit({
      id,
      name: `${scope} Renombrada`,
      abbreviation: 'kg',
      taxCode: 'KGM',
      isActive: false,
    });
    expect(result.success).toBe(true);

    const rows = await db
      .select({
        name: productUnit.name,
        abbreviation: productUnit.abbreviation,
        taxCode: productUnit.taxCode,
        isActive: productUnit.isActive,
      })
      .from(productUnit)
      .where(eq(productUnit.id, id))
      .limit(1);
    const updated = rows[0];

    expect(updated?.name).toBe(`${scope} Renombrada`);
    expect(updated?.abbreviation).toBe('kg');
    expect(updated?.taxCode).toBe('KGM');
    expect(updated?.isActive).toBe(false);
  });

  it('fails with not_found for a missing unit', async () => {
    const result = await updateProductUnit({
      id: 'unit_does_not_exist',
      name: 'Cualquiera',
      isActive: true,
    });

    expect(result).toEqual({ success: false, error: 'El recurso solicitado no existe' });
  });
});

describe('archiveProductUnit', () => {
  it('soft deletes the unit', async () => {
    const id = await seedUnit('Para Archivar');

    const result = await archiveProductUnit({ id });
    expect(result.success).toBe(true);

    const rows = await db
      .select({ deletedAt: productUnit.deletedAt })
      .from(productUnit)
      .where(eq(productUnit.id, id))
      .limit(1);
    expect(rows[0]?.deletedAt).toBeInstanceOf(Date);
  });

  it('fails with not_found for a missing unit', async () => {
    const result = await archiveProductUnit({ id: 'unit_does_not_exist' });

    expect(result).toEqual({ success: false, error: 'El recurso solicitado no existe' });
  });
});
