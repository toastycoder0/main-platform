import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { tag } from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list/list-params';
import { getTag, listTags } from './tags.query';

const scope = `listtags${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const createdTagIds: string[] = [];
const seededNames: string[] = [];

let firstTagId = '';
let archivedTagId = '';

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
    const name = `${scope}_tag_${String(index + 1).padStart(2, '0')}`;
    return { slug: name, name, sortOrder: index };
  });

  const inserted = await db.insert(tag).values(plain).returning({ id: tag.id });
  createdTagIds.push(...inserted.map((row) => row.id));
  seededNames.push(...plain.map((value) => value.name));

  const first = inserted.at(0);
  if (!first) {
    throw new Error('Failed to create test tags');
  }
  firstTagId = first.id;

  const archived = await db
    .insert(tag)
    .values({ slug: `${scope}_tag_archived`, name: `${scope}_tag_archived` })
    .returning({ id: tag.id });
  const archivedRow = archived.at(0);
  if (!archivedRow) {
    throw new Error('Failed to create archived test tag');
  }
  archivedTagId = archivedRow.id;
  createdTagIds.push(archivedRow.id);

  await db.update(tag).set({ deletedAt: new Date() }).where(eq(tag.id, archivedTagId));
});

afterAll(async () => {
  if (createdTagIds.length > 0) {
    await db.delete(tag).where(inArray(tag.id, createdTagIds));
  }
});

describe('listTags', () => {
  it('returns the first page ordered by sortOrder then id', async () => {
    const result = await listTags(testContext(), params());

    expect(result.total).toBe(seededNames.length);
    expect(result.items).toHaveLength(10);
    expect(result.items.map((item) => item.name)).toEqual(seededNames.slice(0, 10));
  });

  it('returns the remaining items on the second page', async () => {
    const result = await listTags(testContext(), params({ page: 2 }));

    expect(result.total).toBe(seededNames.length);
    expect(result.items.map((item) => item.name)).toEqual(seededNames.slice(10));
  });

  it('matches the search against the slug as well as the name', async () => {
    const result = await listTags(testContext(), params({ q: `${scope}_tag_07` }));

    expect(result.total).toBe(1);
    expect(result.items[0]?.slug).toBe(`${scope}_tag_07`);
  });

  it('excludes archived tags from the results and total', async () => {
    const result = await listTags(testContext(), params({ q: `${scope}_tag_archived` }));

    expect(result.total).toBe(0);
  });

  it('treats LIKE wildcards in the search as literals', async () => {
    const result = await listTags(testContext(), params({ q: `${scope}%` }));

    expect(result.total).toBe(0);
  });
});

describe('getTag', () => {
  it('returns undefined for a missing tag', async () => {
    expect(await getTag(testContext(), 'tag_does_not_exist')).toBeUndefined();
  });

  it('returns the tag for a valid id', async () => {
    const result = await getTag(testContext(), firstTagId);

    expect(result?.id).toBe(firstTagId);
    expect(result?.name).toBe(seededNames[0]);
  });

  it('returns undefined for an archived tag', async () => {
    expect(await getTag(testContext(), archivedTagId)).toBeUndefined();
  });
});
