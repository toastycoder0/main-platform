import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { documentType } from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list/list-params';
import { getDocumentType, listDocumentTypes } from './document-types.query';

const scope = `listdoct${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const createdDocumentTypeIds: string[] = [];
const seededNames: string[] = [];

let firstDocumentTypeId = '';
let archivedDocumentTypeId = '';

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
    const name = `${scope}_doct_${String(index + 1).padStart(2, '0')}`;
    return { slug: name, name, sortOrder: index };
  });

  const inserted = await db.insert(documentType).values(plain).returning({ id: documentType.id });
  createdDocumentTypeIds.push(...inserted.map((row) => row.id));
  seededNames.push(...plain.map((value) => value.name));

  const first = inserted.at(0);
  if (!first) {
    throw new Error('Failed to create test document types');
  }
  firstDocumentTypeId = first.id;

  const archived = await db
    .insert(documentType)
    .values({ slug: `${scope}_doct_archived`, name: `${scope}_doct_archived` })
    .returning({ id: documentType.id });
  const archivedRow = archived.at(0);
  if (!archivedRow) {
    throw new Error('Failed to create archived test document type');
  }
  archivedDocumentTypeId = archivedRow.id;
  createdDocumentTypeIds.push(archivedRow.id);

  await db
    .update(documentType)
    .set({ deletedAt: new Date() })
    .where(eq(documentType.id, archivedDocumentTypeId));
});

afterAll(async () => {
  if (createdDocumentTypeIds.length > 0) {
    await db.delete(documentType).where(inArray(documentType.id, createdDocumentTypeIds));
  }
});

describe('listDocumentTypes', () => {
  it('returns the first page ordered by sortOrder then id', async () => {
    const result = await listDocumentTypes(testContext(), params());

    expect(result.total).toBe(seededNames.length);
    expect(result.items).toHaveLength(10);
    expect(result.items.map((item) => item.name)).toEqual(seededNames.slice(0, 10));
  });

  it('returns the remaining items on the second page', async () => {
    const result = await listDocumentTypes(testContext(), params({ page: 2 }));

    expect(result.total).toBe(seededNames.length);
    expect(result.items.map((item) => item.name)).toEqual(seededNames.slice(10));
  });

  it('matches the search against the slug as well as the name', async () => {
    const result = await listDocumentTypes(testContext(), params({ q: `${scope}_doct_07` }));

    expect(result.total).toBe(1);
    expect(result.items[0]?.slug).toBe(`${scope}_doct_07`);
  });

  it('excludes archived document types from the results and total', async () => {
    const result = await listDocumentTypes(testContext(), params({ q: `${scope}_doct_archived` }));

    expect(result.total).toBe(0);
  });

  it('treats LIKE wildcards in the search as literals', async () => {
    const result = await listDocumentTypes(testContext(), params({ q: `${scope}%` }));

    expect(result.total).toBe(0);
  });
});

describe('getDocumentType', () => {
  it('returns undefined for a missing document type', async () => {
    expect(await getDocumentType(testContext(), 'doct_does_not_exist')).toBeUndefined();
  });

  it('returns the document type for a valid id', async () => {
    const result = await getDocumentType(testContext(), firstDocumentTypeId);

    expect(result?.id).toBe(firstDocumentTypeId);
    expect(result?.name).toBe(seededNames[0]);
  });

  it('returns undefined for an archived document type', async () => {
    expect(await getDocumentType(testContext(), archivedDocumentTypeId)).toBeUndefined();
  });
});
