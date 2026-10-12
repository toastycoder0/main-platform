import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { priceList } from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list/list-params';
import { getPriceList, listPriceLists } from './price-lists.query';

const scope = `listplists${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const createdPriceListIds: string[] = [];
const seededNames: string[] = [];

let firstPriceListId = '';
let archivedPriceListId = '';

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
    const name = `${scope}_plist_${String(index + 1).padStart(2, '0')}`;
    return { slug: name, name, sortOrder: index };
  });

  const inserted = await db.insert(priceList).values(plain).returning({ id: priceList.id });
  createdPriceListIds.push(...inserted.map((row) => row.id));
  seededNames.push(...plain.map((value) => value.name));

  const first = inserted.at(0);
  if (!first) {
    throw new Error('Failed to create test price lists');
  }
  firstPriceListId = first.id;

  const archived = await db
    .insert(priceList)
    .values({ slug: `${scope}_plist_archived`, name: `${scope}_plist_archived` })
    .returning({ id: priceList.id });
  const archivedRow = archived.at(0);
  if (!archivedRow) {
    throw new Error('Failed to create archived test price list');
  }
  archivedPriceListId = archivedRow.id;
  createdPriceListIds.push(archivedRow.id);

  await db
    .update(priceList)
    .set({ deletedAt: new Date() })
    .where(eq(priceList.id, archivedPriceListId));
});

afterAll(async () => {
  if (createdPriceListIds.length > 0) {
    await db.delete(priceList).where(inArray(priceList.id, createdPriceListIds));
  }
});

describe('listPriceLists', () => {
  it('returns the first page ordered by sortOrder then id', async () => {
    const result = await listPriceLists(testContext(), params());

    expect(result.total).toBe(seededNames.length);
    expect(result.items).toHaveLength(10);
    expect(result.items.map((item) => item.name)).toEqual(seededNames.slice(0, 10));
  });

  it('returns the remaining items on the second page', async () => {
    const result = await listPriceLists(testContext(), params({ page: 2 }));

    expect(result.total).toBe(seededNames.length);
    expect(result.items.map((item) => item.name)).toEqual(seededNames.slice(10));
  });

  it('honors a custom page size', async () => {
    const result = await listPriceLists(testContext(), params({ pageSize: 25 }));

    expect(result.items).toHaveLength(seededNames.length);
  });

  it('matches the search against the slug as well as the name', async () => {
    const result = await listPriceLists(testContext(), params({ q: `${scope}_plist_07` }));

    expect(result.total).toBe(1);
    expect(result.items[0]?.slug).toBe(`${scope}_plist_07`);
  });

  it('excludes archived price lists from the results and total', async () => {
    const result = await listPriceLists(testContext(), params({ q: `${scope}_plist_archived` }));

    expect(result.total).toBe(0);
  });

  it('returns an empty page when nothing matches', async () => {
    const result = await listPriceLists(testContext(), params({ q: `${scope}_nope` }));

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('reports the real total on a page beyond the last one', async () => {
    const result = await listPriceLists(testContext(), params({ page: 999 }));

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(seededNames.length);
  });

  it('treats LIKE wildcards in the search as literals', async () => {
    const result = await listPriceLists(testContext(), params({ q: `${scope}%` }));

    expect(result.total).toBe(0);
  });
});

describe('getPriceList', () => {
  it('returns undefined for a missing price list', async () => {
    expect(await getPriceList(testContext(), 'plst_does_not_exist')).toBeUndefined();
  });

  it('returns the price list for a valid id', async () => {
    const result = await getPriceList(testContext(), firstPriceListId);

    expect(result?.id).toBe(firstPriceListId);
    expect(result?.name).toBe(seededNames[0]);
  });

  it('returns undefined for an archived price list', async () => {
    expect(await getPriceList(testContext(), archivedPriceListId)).toBeUndefined();
  });
});
