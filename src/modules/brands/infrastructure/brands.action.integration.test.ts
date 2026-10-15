import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { brand, file } from '@/infrastructure/db/schema';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { archiveBrand, createBrand, updateBrand } from './brands.action';

const scope = `updbrand${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

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

vi.mock('@/infrastructure/storage/client', () => ({
  storageClient: {
    getPresignedUploadUrl: vi.fn(() => Promise.resolve('https://upload.test/put')),
    fileExists: vi.fn(() => Promise.resolve(true)),
    deleteFile: vi.fn(() => Promise.resolve()),
    copyFile: vi.fn(() => Promise.resolve()),
    getPublicUrl: (key: string) => `https://cdn.test/${key}`,
  },
}));

const createdBrandIds: string[] = [];
const createdFileIds: string[] = [];

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
        email: `${scope}@brands-action.test`,
        firstName: 'Brands',
        lastName: 'Action',
        name: 'Brands Action',
      },
      session: { id: 'sess_itest', expiresAt: new Date(Date.now() + 60_000) },
    },
    permissions: new Set([
      PERMISSIONS.admin.brands.create,
      PERMISSIONS.admin.brands.edit,
      PERMISSIONS.admin.brands.delete,
    ]),
    logger,
    requestId: 'itest',
  };
}

async function seedBrand(name: string): Promise<string> {
  const id = `brd_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  await db.insert(brand).values({
    id,
    slug: `${scope}_${name}`,
    name,
    sortOrder: createdBrandIds.length,
  });
  createdBrandIds.push(id);
  return id;
}

async function findBrand(id: string): Promise<
  | {
      name: string;
      description: string | null;
      slug: string;
      isActive: boolean;
      deletedAt: Date | null;
    }
  | undefined
> {
  const rows = await db
    .select({
      name: brand.name,
      description: brand.description,
      slug: brand.slug,
      isActive: brand.isActive,
      deletedAt: brand.deletedAt,
    })
    .from(brand)
    .where(eq(brand.id, id))
    .limit(1);
  return rows[0];
}

beforeEach(() => {
  state.ctx = testContext();
});

afterAll(async () => {
  if (createdFileIds.length > 0) {
    await db.delete(file).where(inArray(file.tempKey, createdFileIds));
  }

  if (createdBrandIds.length > 0) {
    await db.delete(brand).where(inArray(brand.id, createdBrandIds));
  }
});

describe('createBrand', () => {
  it('creates a brand with a slug derived from the name', async () => {
    const name = `${scope} Ferretería Del Norte`;

    const result = await createBrand({
      name,
      description: 'Marca del norte',
      isActive: false,
    });
    expect(result.success).toBe(true);

    const rows = await db
      .select({
        id: brand.id,
        slug: brand.slug,
        description: brand.description,
        isActive: brand.isActive,
      })
      .from(brand)
      .where(eq(brand.name, name))
      .limit(1);
    const created = rows[0];

    expect(created?.slug).toMatch(new RegExp(`^${scope}-ferreteria-del-norte-[a-f0-9]{6}$`));
    expect(created?.description).toBe('Marca del norte');
    expect(created?.isActive).toBe(false);

    if (created) {
      createdBrandIds.push(created.id);
    }
  });

  it('generates a suffixed slug when the base slug is already taken', async () => {
    const name = `${scope} Slug Repetido`;

    expect((await createBrand({ name, description: null, isActive: true })).success).toBe(true);

    expect((await createBrand({ name, description: null, isActive: true })).success).toBe(true);

    const rows = await db
      .select({ id: brand.id, slug: brand.slug })
      .from(brand)
      .where(eq(brand.name, name));

    expect(rows).toHaveLength(2);
    const slugs = rows.map((row) => row.slug);
    expect(slugs[0]).toMatch(new RegExp(`^${scope}-slug-repetido-[a-f0-9]{6}$`));
    expect(slugs[1]?.startsWith(`${scope}-slug-repetido-`)).toBe(true);
    expect(slugs[0]).not.toBe(slugs[1]);

    createdBrandIds.push(...rows.map((row) => row.id));
  });

  it('rejects creation when the actor lacks the create permission', async () => {
    state.ctx = {
      ...testContext(),
      permissions: new Set([PERMISSIONS.admin.brands.edit]),
    };

    const result = await createBrand({
      name: `${scope} Forbidden`,
      description: null,
      isActive: true,
    });

    expect(result).toEqual({
      success: false,
      error: 'No tienes permiso para realizar esta acción',
    });
  });

  it('rejects empty names through schema validation', async () => {
    const result = await createBrand({ name: '   ', description: null, isActive: true });

    expect(result).toEqual({ success: false, error: 'Datos inválidos' });
  });

  it('attaches an image when one is provided', async () => {
    const name = `${scope} Con Imagen`;
    const tempKey = `_temp/${scope}_create.jpg`;

    await db.insert(file).values({
      tempKey,
      entity: 'brand',
      scope: 'image',
      createdBy: 'user_itest',
    });
    createdFileIds.push(tempKey);

    const result = await createBrand({ name, description: null, isActive: true, image: tempKey });
    expect(result.success).toBe(true);

    const rows = await db.select({ id: brand.id }).from(brand).where(eq(brand.name, name)).limit(1);
    const created = rows[0];

    if (created) {
      createdBrandIds.push(created.id);
    }

    const attached = await db
      .select({ ownerId: file.ownerId, key: file.key })
      .from(file)
      .where(
        and(eq(file.entity, 'brand'), eq(file.scope, 'image'), eq(file.ownerId, created?.id ?? '')),
      )
      .limit(1);

    expect(attached[0]?.ownerId).toBe(created?.id);
    expect(attached[0]?.key).toContain('brands/images');
  });
});

describe('updateBrand', () => {
  it('updates brand fields including the active state', async () => {
    const id = await seedBrand('Para Actualizar');

    const result = await updateBrand({
      id,
      name: `${scope} Renombrada`,
      description: 'Descripción nueva',
      isActive: false,
    });
    expect(result.success).toBe(true);

    const updated = await findBrand(id);
    expect(updated?.name).toBe(`${scope} Renombrada`);
    expect(updated?.description).toBe('Descripción nueva');
    expect(updated?.isActive).toBe(false);
  });

  it('fails with not_found for a missing brand', async () => {
    const result = await updateBrand({
      id: 'brd_does_not_exist',
      name: 'Cualquiera',
      description: null,
      isActive: true,
    });

    expect(result).toEqual({ success: false, error: 'El recurso solicitado no existe' });
  });

  it('attaches an image to an existing brand', async () => {
    const id = await seedBrand('Con Imagen Update');
    const tempKey = `_temp/${scope}_update.jpg`;

    await db.insert(file).values({
      tempKey,
      entity: 'brand',
      scope: 'image',
      createdBy: 'user_itest',
    });
    createdFileIds.push(tempKey);

    const result = await updateBrand({
      id,
      name: `${scope} Con Imagen Update`,
      description: null,
      isActive: true,
      image: tempKey,
    });
    expect(result.success).toBe(true);

    const attached = await db
      .select({ ownerId: file.ownerId, key: file.key })
      .from(file)
      .where(and(eq(file.entity, 'brand'), eq(file.scope, 'image'), eq(file.ownerId, id)))
      .limit(1);

    expect(attached[0]?.ownerId).toBe(id);
    expect(attached[0]?.key).toContain('brands/images');
  });
});

describe('archiveBrand', () => {
  it('soft deletes the brand', async () => {
    const id = await seedBrand('Para Archivar');

    const result = await archiveBrand({ id });
    expect(result.success).toBe(true);

    const archived = await findBrand(id);
    expect(archived?.deletedAt).toBeInstanceOf(Date);
  });

  it('fails with not_found for a missing brand', async () => {
    const result = await archiveBrand({ id: 'brd_does_not_exist' });

    expect(result).toEqual({ success: false, error: 'El recurso solicitado no existe' });
  });
});
