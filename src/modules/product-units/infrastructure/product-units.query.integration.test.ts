import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { productUnit } from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list/list-params';
import { getProductUnit, listProductUnits } from './product-units.query';

const scope = `listunits${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const createdUnitIds: string[] = [];
const seededNames: string[] = [];

let firstUnitId = '';
let archivedUnitId = '';

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
    const name = `${scope}_unit_${String(index + 1).padStart(2, '0')}`;
    return { slug: name, name, sortOrder: index };
  });

  const inserted = await db.insert(productUnit).values(plain).returning({ id: productUnit.id });
  createdUnitIds.push(...inserted.map((row) => row.id));
  seededNames.push(...plain.map((value) => value.name));

  const first = inserted.at(0);
  if (!first) {
    throw new Error('Failed to create test units');
  }
  firstUnitId = first.id;

  const archived = await db
    .insert(productUnit)
    .values({ slug: `${scope}_unit_archived`, name: `${scope}_unit_archived` })
    .returning({ id: productUnit.id });
  const archivedRow = archived.at(0);
  if (!archivedRow) {
    throw new Error('Failed to create archived test unit');
  }
  archivedUnitId = archivedRow.id;
  createdUnitIds.push(archivedRow.id);

  await db
    .update(productUnit)
    .set({ deletedAt: new Date() })
    .where(eq(productUnit.id, archivedUnitId));
});

afterAll(async () => {
  if (createdUnitIds.length > 0) {
    await db.delete(productUnit).where(inArray(productUnit.id, createdUnitIds));
  }
});

describe('listProductUnits', () => {
  it('returns the first page ordered by sortOrder then id', async () => {
    const result = await listProductUnits(testContext(), params());

    expect(result.total).toBe(seededNames.length);
    expect(result.items).toHaveLength(10);
    expect(result.items.map((item) => item.name)).toEqual(seededNames.slice(0, 10));
  });

  it('returns the remaining items on the second page', async () => {
    const result = await listProductUnits(testContext(), params({ page: 2 }));

    expect(result.total).toBe(seededNames.length);
    expect(result.items.map((item) => item.name)).toEqual(seededNames.slice(10));
  });

  it('matches the search against the slug as well as the name', async () => {
    const result = await listProductUnits(testContext(), params({ q: `${scope}_unit_07` }));

    expect(result.total).toBe(1);
    expect(result.items[0]?.slug).toBe(`${scope}_unit_07`);
  });

  it('excludes archived units from the results and total', async () => {
    const result = await listProductUnits(testContext(), params({ q: `${scope}_unit_archived` }));

    expect(result.total).toBe(0);
  });

  it('treats LIKE wildcards in the search as literals', async () => {
    const result = await listProductUnits(testContext(), params({ q: `${scope}%` }));

    expect(result.total).toBe(0);
  });
});

describe('getProductUnit', () => {
  it('returns undefined for a missing unit', async () => {
    expect(await getProductUnit(testContext(), 'unit_does_not_exist')).toBeUndefined();
  });

  it('returns the unit for a valid id', async () => {
    const result = await getProductUnit(testContext(), firstUnitId);

    expect(result?.id).toBe(firstUnitId);
    expect(result?.name).toBe(seededNames[0]);
  });

  it('returns undefined for an archived unit', async () => {
    expect(await getProductUnit(testContext(), archivedUnitId)).toBeUndefined();
  });
});
