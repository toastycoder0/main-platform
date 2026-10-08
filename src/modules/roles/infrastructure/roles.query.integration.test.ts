import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { permission, role, rolePermission, user, userRole } from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list/list-params';
import { getRole, listPermissionOptions, listRoles, listUserRoleIds } from './roles.query';

const scope = `listroles${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const createdRoleIds: string[] = [];
const createdUserIds: string[] = [];
const seededNames: string[] = [];

let firstRoleId = '';
let emptyRoleId = '';
let lastRoleId = '';

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
  const second = inserted.at(1);
  const last = inserted.at(11);
  if (!first || !second || !last) {
    throw new Error('Failed to create test roles');
  }

  firstRoleId = first.id;
  emptyRoleId = second.id;
  lastRoleId = last.id;

  await db.insert(rolePermission).values([
    { roleId: first.id, permissionId: permA.id },
    { roleId: last.id, permissionId: permA.id },
    { roleId: last.id, permissionId: permB.id },
  ]);

  seededNames.sort((a, b) => a.localeCompare(b));
});

afterAll(async () => {
  if (createdUserIds.length > 0) {
    await db.delete(user).where(inArray(user.id, createdUserIds));
  }
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

  it('reports the real total on a page beyond the last one', async () => {
    const result = await listRoles(testContext(), params({ page: 999 }));

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(seededNames.length);
  });

  it('treats LIKE wildcards in the search as literals', async () => {
    const result = await listRoles(testContext(), params({ q: `${scope}%` }));

    expect(result.total).toBe(0);
  });
});

describe('getRole', () => {
  it('returns undefined for a missing role', async () => {
    expect(await getRole(testContext(), 'role_does_not_exist')).toBeUndefined();
  });

  it('returns the role with its assigned permission ids', async () => {
    const result = await getRole(testContext(), lastRoleId);

    expect(result?.id).toBe(lastRoleId);
    expect(result?.permissionIds?.toSorted()).toEqual([permA.id, permB.id].toSorted());
  });

  it('returns an empty permission list when the role has none', async () => {
    const result = await getRole(testContext(), emptyRoleId);

    expect(result?.id).toBe(emptyRoleId);
    expect(result?.permissionIds).toEqual([]);
  });
});

describe('listPermissionOptions', () => {
  it('includes the seeded test permissions ordered by slug', async () => {
    const options = await listPermissionOptions(testContext());
    const slugs = options.map((option) => option.slug);

    expect(slugs).toContain(permA.slug);
    expect(slugs).toContain(permB.slug);
    expect(slugs.toSorted()).toEqual(slugs);
  });

  it('returns id, slug, name and type for each permission', async () => {
    const options = await listPermissionOptions(testContext());
    const permAOption = options.find((option) => option.id === permA.id);

    expect(permAOption).toEqual({
      id: permA.id,
      slug: permA.slug,
      name: permA.slug,
      type: 'access',
    });
  });
});

describe('listUserRoleIds', () => {
  it('returns an empty list for a user without roles', async () => {
    expect(await listUserRoleIds(testContext(), 'user_does_not_exist')).toEqual([]);
  });

  it('returns the roles assigned to the user', async () => {
    const inserted = await db
      .insert(user)
      .values({ firstName: 'RoleQuery', lastName: 'Test', email: `${scope}@rolequery.test` })
      .returning({ id: user.id });
    const userRow = inserted.at(0);

    if (!userRow) {
      throw new Error('Failed to create test user');
    }

    createdUserIds.push(userRow.id);
    await db.insert(userRole).values({ userId: userRow.id, roleId: firstRoleId });

    expect(await listUserRoleIds(testContext(), userRow.id)).toEqual([firstRoleId]);
  });
});
