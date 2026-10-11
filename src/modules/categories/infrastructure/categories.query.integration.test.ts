import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { category, file } from '@/infrastructure/db/schema';
import { AppError } from '@/shared/errors';
import {
  findCategoryById,
  getCategoryImage,
  getCategoryTree,
  listCategoryOptions,
} from './categories.query';

vi.mock('@/infrastructure/storage/client', () => ({
  storageClient: {
    getPresignedUploadUrl: vi.fn(() => Promise.resolve('https://upload.test/put')),
    fileExists: vi.fn(() => Promise.resolve(true)),
    deleteFile: vi.fn(() => Promise.resolve()),
    copyFile: vi.fn(() => Promise.resolve()),
    getPublicUrl: (key: string) => `https://cdn.test/${key}`,
  },
}));

const scope = `catquery${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const createdCategoryIds: string[] = [];
const createdFileIds: string[] = [];

function testContext(): RequestContext {
  const logger: RequestContext['logger'] = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => logger,
  };

  return { db, session: null, permissions: new Set<string>(), logger, requestId: 'itest' };
}

async function seedCategory(
  overrides: Partial<typeof category.$inferInsert> = {},
): Promise<string> {
  const slug = `${scope}_cat_${createdCategoryIds.length + 1}`;
  const inserted = await db
    .insert(category)
    .values({ slug, name: slug, path: slug, ...overrides })
    .returning({ id: category.id });
  const row = inserted.at(0);

  if (!row) {
    throw new Error('Failed to create test category');
  }

  createdCategoryIds.push(row.id);
  return row.id;
}

let rootId = '';
let deletedId = '';

beforeAll(async () => {
  // Seed 5 categories: root_a, root_b (deleted), child_of_a, child_of_b, another_child_of_a
  const rootA = await seedCategory({ name: `${scope} Alpha`, sortOrder: 0 });
  rootId = rootA;
  const beta = await seedCategory({ name: `${scope} Beta`, deletedAt: new Date(), sortOrder: 1 });
  deletedId = beta;
  await seedCategory({
    parentId: rootA,
    name: `${scope} Child A1`,
    path: `${scope}_cat_1/${scope}_cat_3`,
    sortOrder: 0,
  });
  await seedCategory({
    parentId: rootA,
    name: `${scope} Child A2`,
    path: `${scope}_cat_1/${scope}_cat_4`,
    sortOrder: 1,
  });
  await seedCategory({
    parentId: rootA,
    name: `${scope} Child A3`,
    path: `${scope}_cat_1/${scope}_cat_5`,
    sortOrder: 2,
  });
});

afterAll(async () => {
  if (createdFileIds.length > 0) {
    await db.delete(file).where(inArray(file.id, createdFileIds));
  }

  if (createdCategoryIds.length > 0) {
    await db.delete(category).where(inArray(category.id, createdCategoryIds));
  }
});

describe('findCategoryById', () => {
  it('returns a CategoryFormDTO for an existing category', async () => {
    const result = await findCategoryById(testContext(), rootId);

    expect(result.id).toBe(rootId);
    expect(result.name).toBe(`${scope} Alpha`);
    expect(result.parentId).toBeNull();
    expect(result.isActive).toBe(true);
    expect(result.description).toBeNull();
    expect(result.slug).toBe(`${scope}_cat_1`);
    expect(result.path).toBe(`${scope}_cat_1`);
  });

  it('throws not_found for a non-existent id', async () => {
    await expect(findCategoryById(testContext(), 'cat_does_not_exist')).rejects.toThrow(AppError);
  });

  it('throws not_found for a soft-deleted category', async () => {
    await expect(findCategoryById(testContext(), deletedId)).rejects.toThrow(AppError);
  });
});

describe('getCategoryTree', () => {
  it('returns only active categories in tree order', async () => {
    const tree = await getCategoryTree(testContext());
    const names = tree.map((row) => row.name);

    // root_b (Beta) is soft-deleted, excluded
    expect(names).not.toContain(`${scope} Beta`);
    expect(names).toContain(`${scope} Alpha`);
    expect(names).toContain(`${scope} Child A1`);
  });

  it('orders by parentId, sortOrder, id', async () => {
    const tree = await getCategoryTree(testContext());
    const alpha = tree.find((r) => r.name === `${scope} Alpha`);
    const children = tree.filter((r) => r.parentId === alpha?.id);

    expect(children).toHaveLength(3);
    expect(children[0]?.name).toBe(`${scope} Child A1`);
    expect(children[1]?.name).toBe(`${scope} Child A2`);
    expect(children[2]?.name).toBe(`${scope} Child A3`);
  });

  it('normalizes null parentId and description', async () => {
    const tree = await getCategoryTree(testContext());
    const alpha = tree.find((r) => r.name === `${scope} Alpha`);

    expect(alpha?.parentId).toBeNull();
    expect(alpha?.description).toBeNull();
  });
});

describe('getCategoryImage', () => {
  it('returns null when no image is associated', async () => {
    const image = await getCategoryImage(testContext(), rootId);

    expect(image).toBeNull();
  });

  it('returns the image URL when a file row exists', async () => {
    const inserted = await db
      .insert(file)
      .values({
        entity: 'category',
        scope: 'image',
        ownerId: rootId,
        key: `${scope}/image.jpg`,
        sortOrder: 0,
      })
      .returning({ id: file.id });
    const row = inserted.at(0);

    if (!row) {
      throw new Error('Failed to create test file');
    }

    createdFileIds.push(row.id);

    const image = await getCategoryImage(testContext(), rootId);
    expect(image).toBe(`http://test.com/${scope}/image.jpg`);
  });
});

describe('listCategoryOptions', () => {
  it('returns all active categories ordered by name', async () => {
    const options = await listCategoryOptions(testContext());
    const names = options.map((o) => o.label);

    expect(names).toContain(`${scope} Alpha`);
    expect(names).not.toContain(`${scope} Beta`);
    expect(names).toEqual([...names].sort());
  });

  it('excludes the specified id', async () => {
    const options = await listCategoryOptions(testContext(), rootId);
    const ids = options.map((o) => o.value);

    expect(ids).not.toContain(rootId);
    expect(ids.length).toBeGreaterThanOrEqual(3);
  });

  it('excludes soft-deleted categories', async () => {
    const options = await listCategoryOptions(testContext());
    const names = options.map((o) => o.label);

    expect(names).not.toContain(`${scope} Beta`);
  });

  it('returns label and value for each option', async () => {
    const options = await listCategoryOptions(testContext());
    const alpha = options.find((o) => o.label === `${scope} Alpha`);

    expect(alpha).toBeDefined();
    expect(alpha?.value).toBe(rootId);
  });
});
