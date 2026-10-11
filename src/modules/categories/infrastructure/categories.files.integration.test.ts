import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { category, file } from '@/infrastructure/db/schema';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { syncCategoryImage } from './categories.files';

const scope = `catfile${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

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
const createdCategoryIds: string[] = [];

async function seedCategoryWithImage(): Promise<{ categoryId: string; tempKey: string }> {
  const slug = `${scope}_cat`;
  const inserted = await db
    .insert(category)
    .values({ slug, name: slug, path: slug })
    .returning({ id: category.id });
  const catRow = inserted.at(0);

  if (!catRow) {
    throw new Error('Failed to create test category');
  }

  createdCategoryIds.push(catRow.id);

  const tempKey = `_temp/${scope}_img.jpg`;
  await db.insert(file).values({
    tempKey,
    entity: 'category',
    scope: 'image',
    createdBy: 'cat_files_test',
  });
  createdFileIds.push(tempKey);

  return { categoryId: catRow.id, tempKey };
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
        id: 'cat_files_test',
        email: `${scope}@cat-file.test`,
        firstName: 'CatFiles',
        lastName: 'Test',
        name: 'CatFiles Test',
      },
      session: { id: 'sess_catfile', expiresAt: new Date(Date.now() + 60_000) },
    },
    permissions: new Set([PERMISSIONS.admin.categories.edit]),
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

  if (createdCategoryIds.length > 0) {
    await db.delete(category).where(inArray(category.id, createdCategoryIds));
  }
});

describe('syncCategoryImage', () => {
  it('is a no-op when imageRef is null or undefined', async () => {
    const slug = `${scope}_noop`;
    const inserted = await db
      .insert(category)
      .values({ slug, name: slug, path: slug })
      .returning({ id: category.id });
    const catRow = inserted.at(0);

    if (!catRow) {
      throw new Error('Failed to create test category');
    }

    createdCategoryIds.push(catRow.id);

    await expect(syncCategoryImage(db, catRow.id, 'cat_files_test', null)).resolves.not.toThrow();
    await expect(
      syncCategoryImage(db, catRow.id, 'cat_files_test', undefined),
    ).resolves.not.toThrow();
  });

  it('syncs a temp image ref to the category', async () => {
    const { categoryId, tempKey } = await seedCategoryWithImage();

    await syncCategoryImage(db, categoryId, 'cat_files_test', tempKey);

    const rows = await db
      .select({ ownerId: file.ownerId, key: file.key })
      .from(file)
      .where(and(eq(file.ownerId, categoryId), eq(file.entity, 'category'), eq(file.scope, 'image')))
      .limit(1);
    expect(rows[0]?.ownerId).toBe(categoryId);
    expect(rows[0]?.key).toBeTruthy();
    expect(rows[0]?.key).toContain('categories/images');
  });

  it('replaces the previous image when syncing a new one', async () => {
    const { categoryId, tempKey } = await seedCategoryWithImage();
    const newTempKey = `_temp/${scope}_new.jpg`;

    await db.insert(file).values({
      tempKey: newTempKey,
      entity: 'category',
      scope: 'image',
      createdBy: 'cat_files_test',
    });
    createdFileIds.push(newTempKey);

    const [oldFileBefore] = await db
      .select({ id: file.id })
      .from(file)
      .where(eq(file.tempKey, tempKey))
      .limit(1);

    // First sync
    await syncCategoryImage(db, categoryId, 'cat_files_test', tempKey);

    const [oldRow] = await db
      .select({ ownerId: file.ownerId })
      .from(file)
      .where(eq(file.id, oldFileBefore!.id))
      .limit(1);
    expect(oldRow?.ownerId).toBe(categoryId);

    // Second sync with new tempKey should detach the old one
    await syncCategoryImage(db, categoryId, 'cat_files_test', newTempKey);

    const [detached] = await db
      .select({ ownerId: file.ownerId })
      .from(file)
      .where(eq(file.id, oldFileBefore!.id))
      .limit(1);
    expect(detached?.ownerId).toBeNull();
  });
});
