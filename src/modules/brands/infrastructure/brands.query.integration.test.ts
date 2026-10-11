import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { brand } from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list/list-params';
import { getBrand, listBrands } from './brands.query';

const scope = `listbrands${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const createdBrandIds: string[] = [];
const seededNames: string[] = [];

let firstBrandId = '';
let archivedBrandId = '';

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

function params(overrides: Partial<ListParams> = {}): ListParams {
  return { q: scope, page: 1, pageSize: 10, ...overrides };
}

beforeAll(async () => {
  const plain = Array.from({ length: 12 }, (_, index) => {
    const name = `${scope}_brand_${String(index + 1).padStart(2, '0')}`;
    return { slug: name, name, sortOrder: index };
  });

  const inserted = await db.insert(brand).values(plain).returning({ id: brand.id });
  createdBrandIds.push(...inserted.map((row) => row.id));
  seededNames.push(...plain.map((value) => value.name));

  const first = inserted.at(0);
  if (!first) {
    throw new Error('Failed to create test brands');
  }
  firstBrandId = first.id;

  const archived = await db
    .insert(brand)
    .values({ slug: `${scope}_brand_archived`, name: `${scope}_brand_archived` })
    .returning({ id: brand.id });
  const archivedRow = archived.at(0);
  if (!archivedRow) {
    throw new Error('Failed to create archived test brand');
  }
  archivedBrandId = archivedRow.id;
  createdBrandIds.push(archivedRow.id);

  await db.update(brand).set({ deletedAt: new Date() }).where(eq(brand.id, archivedBrandId));
});

afterAll(async () => {
  if (createdBrandIds.length > 0) {
    await db.delete(brand).where(inArray(brand.id, createdBrandIds));
  }
});

describe('listBrands', () => {
  it('returns the first page ordered by sortOrder then id', async () => {
    const result = await listBrands(testContext(), params());

    expect(result.total).toBe(seededNames.length);
    expect(result.items).toHaveLength(10);
    expect(result.items.map((item) => item.name)).toEqual(seededNames.slice(0, 10));
  });

  it('returns the remaining items on the second page', async () => {
    const result = await listBrands(testContext(), params({ page: 2 }));

    expect(result.total).toBe(seededNames.length);
    expect(result.items.map((item) => item.name)).toEqual(seededNames.slice(10));
  });

  it('honors a custom page size', async () => {
    const result = await listBrands(testContext(), params({ pageSize: 25 }));

    expect(result.items).toHaveLength(seededNames.length);
  });

  it('matches the search against the slug as well as the name', async () => {
    const result = await listBrands(testContext(), params({ q: `${scope}_brand_07` }));

    expect(result.total).toBe(1);
    expect(result.items[0]?.slug).toBe(`${scope}_brand_07`);
  });

  it('excludes archived brands from the results and total', async () => {
    const result = await listBrands(testContext(), params({ q: `${scope}_brand_archived` }));

    expect(result.total).toBe(0);
  });

  it('returns an empty page when nothing matches', async () => {
    const result = await listBrands(testContext(), params({ q: `${scope}_nope` }));

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('reports the real total on a page beyond the last one', async () => {
    const result = await listBrands(testContext(), params({ page: 999 }));

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(seededNames.length);
  });

  it('treats LIKE wildcards in the search as literals', async () => {
    const result = await listBrands(testContext(), params({ q: `${scope}%` }));

    expect(result.total).toBe(0);
  });
});

describe('getBrand', () => {
  it('returns undefined for a missing brand', async () => {
    expect(await getBrand(testContext(), 'brd_does_not_exist')).toBeUndefined();
  });

  it('returns the brand for a valid id', async () => {
    const result = await getBrand(testContext(), firstBrandId);

    expect(result?.id).toBe(firstBrandId);
    expect(result?.name).toBe(seededNames[0]);
  });

  it('returns undefined for an archived brand', async () => {
    expect(await getBrand(testContext(), archivedBrandId)).toBeUndefined();
  });
});
