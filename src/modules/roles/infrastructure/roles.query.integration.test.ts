import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { permission, role, rolePermission } from '@/infrastructure/db/schema';
import type { RolesListParams } from '../application/roles.params';
import { listRoles } from './roles.query';

const scope = `listroles${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const createdRoleIds: string[] = [];
const seededNames: string[] = [];

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

function params(overrides: Partial<RolesListParams> = {}): RolesListParams {
  return { q: scope, page: 1, pageSize: 10, permission: null, ...overrides };
}

async function seedRoles(values: { slug: string; name: string }[]): Promise<{ id: string }[]> {
  const inserted = await db.insert(role).values(values).returning({ id: role.id });

  createdRoleIds.push(...inserted.map((row) => row.id));
  seededNames.push(...values.map((value) => value.name));

  return inserted;
}

async function seedPermission(
  label: string,
  type: 'access' | 'action' | 'view',
): Promise<{ id: string; slug: string }> {
  const inserted = await db
    .insert(permission)
    .values({ slug: `${scope}.${label}`, name: `${scope}.${label}`, type })
    .returning({ id: permission.id, slug: permission.slug });
  const row = inserted.at(0);
  if (!row) {
    throw new Error('Failed to create test permission');
  }
  return row;
}

let permA = { id: '', slug: '' };
let permB = { id: '', slug: '' };

beforeAll(async () => {
  const plain = Array.from({ length: 12 }, (_, index) => ({
    slug: `${scope}_role_${String(index + 1).padStart(2, '0')}`,
    name: `${scope}_role_${String(index + 1).padStart(2, '0')}`,
  }));
  const inserted = await seedRoles(plain);

  permA = await seedPermission('a', 'access');
  permB = await seedPermission('b', 'action');

  const first = inserted.at(0);
  const last = inserted.at(11);
  if (!first || !last) {
    throw new Error('Failed to create test roles');
  }

  await db.insert(rolePermission).values([
    { roleId: first.id, permissionId: permA.id },
    { roleId: last.id, permissionId: permA.id },
    { roleId: last.id, permissionId: permB.id },
  ]);

  seededNames.sort((a, b) => a.localeCompare(b));
});

afterAll(async () => {
  if (createdRoleIds.length > 0) {
    await db.delete(role).where(inArray(role.id, createdRoleIds));
  }
});

describe('listRoles', () => {
  it('returns the first page ordered by name with permission counts', async () => {
    const result = await listRoles(testContext(), params());

    expect(result.total).toBe(seededNames.length);
    expect(result.items).toHaveLength(10);
    expect(result.items.map((item) => item.name)).toEqual(seededNames.slice(0, 10));

    const byName = new Map(result.items.map((item) => [item.name, item.permissionsCount]));
    expect(byName.get(`${scope}_role_01`)).toBe(1);
    expect(byName.get(`${scope}_role_05`)).toBe(0);
  });

  it('returns the remaining items on the second page', async () => {
    const result = await listRoles(testContext(), params({ page: 2 }));

    expect(result.total).toBe(seededNames.length);
    expect(result.items.map((item) => item.name)).toEqual(seededNames.slice(10));

    const byName = new Map(result.items.map((item) => [item.name, item.permissionsCount]));
    expect(byName.get(`${scope}_role_12`)).toBe(2);
  });

  it('honors a custom page size', async () => {
    const result = await listRoles(testContext(), params({ pageSize: 25 }));

    expect(result.items).toHaveLength(seededNames.length);
  });

  it('filters by permission slug', async () => {
    const result = await listRoles(testContext(), params({ permission: permA.slug }));

    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.permissionsCount)).toEqual([1, 2]);
  });

  it('matches the search against the slug as well as the name', async () => {
    const result = await listRoles(testContext(), params({ q: `${scope}_role_07` }));

    expect(result.total).toBe(1);
    expect(result.items[0]?.slug).toBe(`${scope}_role_07`);
  });

  it('returns an empty page when nothing matches', async () => {
    const result = await listRoles(testContext(), params({ q: `${scope}_nope` }));

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('treats LIKE wildcards in the search as literals', async () => {
    const result = await listRoles(testContext(), params({ q: `${scope}%` }));

    expect(result.total).toBe(0);
  });
});
