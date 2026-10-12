import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { brand, file } from '@/infrastructure/db/schema';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { syncBrandImage } from './brands.files';

const scope = `brandfile${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const state = vi.hoisted(() => ({ ctx: undefined as RequestContext | undefined }));

vi.mock('@/infrastructure/context/next-factory', () => ({
  createRequestContext: () => {
    if (!state.ctx) {
      throw new Error('Test context not set');
    }
    return state.ctx;
  },
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

const createdFileIds: string[] = [];
const createdBrandIds: string[] = [];

async function seedBrandWithImage(): Promise<{ brandId: string; tempKey: string }> {
  const slug = `${scope}_brand_${createdBrandIds.length}`;
  const inserted = await db.insert(brand).values({ slug, name: slug }).returning({ id: brand.id });
  const brandRow = inserted.at(0);

  if (!brandRow) {
    throw new Error('Failed to create test brand');
  }

  createdBrandIds.push(brandRow.id);

  const tempKey = `_temp/${scope}_img.jpg`;
  await db.insert(file).values({
    tempKey,
    entity: 'brand',
    scope: 'image',
    createdBy: 'brand_files_test',
  });
  createdFileIds.push(tempKey);

  return { brandId: brandRow.id, tempKey };
}

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
        id: 'brand_files_test',
        email: `${scope}@brand-file.test`,
        firstName: 'BrandFiles',
        lastName: 'Test',
        name: 'BrandFiles Test',
      },
      session: { id: 'sess_brandfile', expiresAt: new Date(Date.now() + 60_000) },
    },
    permissions: new Set([PERMISSIONS.admin.brands.edit]),
    logger,
    requestId: 'itest',
  };
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

describe('syncBrandImage', () => {
  it('is a no-op when imageRef is null or undefined', async () => {
    const slug = `${scope}_noop`;
    const inserted = await db
      .insert(brand)
      .values({ slug, name: slug })
      .returning({ id: brand.id });
    const brandRow = inserted.at(0);

    if (!brandRow) {
      throw new Error('Failed to create test brand');
    }

    createdBrandIds.push(brandRow.id);

    await expect(syncBrandImage(db, brandRow.id, 'brand_files_test', null)).resolves.not.toThrow();
    await expect(
      syncBrandImage(db, brandRow.id, 'brand_files_test', undefined),
    ).resolves.not.toThrow();
  });

  it('syncs a temp image ref to the brand', async () => {
    const { brandId, tempKey } = await seedBrandWithImage();

    await syncBrandImage(db, brandId, 'brand_files_test', tempKey);

    const rows = await db
      .select({ ownerId: file.ownerId, key: file.key })
      .from(file)
      .where(and(eq(file.ownerId, brandId), eq(file.entity, 'brand'), eq(file.scope, 'image')))
      .limit(1);
    expect(rows[0]?.ownerId).toBe(brandId);
    expect(rows[0]?.key).toBeTruthy();
    expect(rows[0]?.key).toContain('brands/images');
  });

  it('replaces the previous image when syncing a new one', async () => {
    const { brandId, tempKey } = await seedBrandWithImage();
    const newTempKey = `_temp/${scope}_new.jpg`;

    await db.insert(file).values({
      tempKey: newTempKey,
      entity: 'brand',
      scope: 'image',
      createdBy: 'brand_files_test',
    });
    createdFileIds.push(newTempKey);

    const [oldFileBefore] = await db
      .select({ id: file.id })
      .from(file)
      .where(eq(file.tempKey, tempKey))
      .limit(1);

    if (!oldFileBefore) {
      throw new Error('Expected oldFileBefore to exist');
    }

    // First sync
    await syncBrandImage(db, brandId, 'brand_files_test', tempKey);

    const [oldRow] = await db
      .select({ ownerId: file.ownerId })
      .from(file)
      .where(eq(file.id, oldFileBefore.id))
      .limit(1);
    expect(oldRow?.ownerId).toBe(brandId);

    // Second sync with newTempKey should detach the old one
    await syncBrandImage(db, brandId, 'brand_files_test', newTempKey);

    const [detached] = await db
      .select({ ownerId: file.ownerId })
      .from(file)
      .where(eq(file.id, oldFileBefore.id))
      .limit(1);
    expect(detached?.ownerId).toBeNull();
  });
});
