import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { permission, role, rolePermission } from '@/infrastructure/db/schema';
import type { RolesListParams } from '../application/roles.validation';
import { getRoleBySlug, listRoles } from './roles.query';

// A unique scope keeps every assertion isolated from rows other runs leave
// behind (the container is reused across runs).
const scope = `listroles${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const createdRoleIds: string[] = [];
const seededNames: string[] = [];
const slugByName = new Map<string, string>();

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
  return { q: scope, page: 1, pageSize: 10, ...overrides };
}

async function seedRole(name: string): Promise<{ id: string; slug: string }> {
  const slug = `${scope}_${createdRoleIds.length}`;
  const inserted = await db.insert(role).values({ slug, name }).returning({ id: role.id });
  const row = inserted.at(0);
  if (!row) {
    throw new Error('Failed to create test role');
  }
  createdRoleIds.push(row.id);
  seededNames.push(name);
  slugByName.set(name, slug);
  return { id: row.id, slug };
}

function slugOf(name: string): string {
  const slug = slugByName.get(name);
  if (!slug) {
    throw new Error(`Missing seeded role ${name}`);
  }
  return slug;
}

async function seedPermission(
  label: string,
  type: 'access' | 'action' | 'view',
): Promise<{ id: string; slug: string }> {
  const slug = `${scope}.${label}`;
  const inserted = await db
    .insert(permission)
    .values({ slug, name: slug, type })
    .returning({ id: permission.id });
  const row = inserted.at(0);
  if (!row) {
    throw new Error('Failed to create test permission');
  }
  return { id: row.id, slug };
}

async function link(roleId: string, permissionId: string): Promise<void> {
  await db.insert(rolePermission).values({ roleId, permissionId });
}

let permA = { id: '', slug: '' };
let permB = { id: '', slug: '' };
let permC = { id: '', slug: '' };

beforeAll(async () => {
  // Twelve plain roles + three specials: enough for a real second page.
  for (let i = 1; i <= 12; i++) {
    await seedRole(`${scope}_role_${String(i).padStart(2, '0')}`);
  }

  permA = await seedPermission('a', 'access');
  permB = await seedPermission('b', 'action');
  permC = await seedPermission('c', 'access');

  const alpha = await seedRole(`${scope}_alpha`);
  const rich = await seedRole(`${scope}_rich`);
  await link(alpha.id, permA.id);
  await link(rich.id, permA.id);
  await link(rich.id, permB.id);
  await link(rich.id, permC.id);
  // Unique name so the slug lookup case cannot match it by name.
  await seedRole(`${scope}_slugspecial`);

  seededNames.sort((a, b) => a.localeCompare(b));
});

afterAll(async () => {
  if (createdRoleIds.length > 0) {
    // role_permission rows cascade with the role.
    await db.delete(role).where(inArray(role.id, createdRoleIds));
  }
});

describe('listRoles', () => {
  it('returns the first page ordered by name with permission counts', async () => {
    const result = await listRoles(testContext(), params());

    expect(result.total).toBe(seededNames.length);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.items).toHaveLength(10);
    expect(result.items.map((item) => item.name)).toEqual(seededNames.slice(0, 10));

    const byName = new Map(result.items.map((item) => [item.name, item.permissionsCount]));
    expect(byName.get(`${scope}_role_01`)).toBe(0);
    expect(byName.get(`${scope}_alpha`)).toBe(1);
    expect(byName.get(`${scope}_rich`)).toBe(3);
  });

  it('returns the remaining items on the second page', async () => {
    const result = await listRoles(testContext(), params({ page: 2 }));

    expect(result.page).toBe(2);
    expect(result.items.map((item) => item.name)).toEqual(seededNames.slice(10));
    expect(result.items.map((item) => item.name)).not.toContain(seededNames[0]);
  });

  it('honors a custom page size', async () => {
    const result = await listRoles(testContext(), params({ pageSize: 25 }));

    expect(result.items).toHaveLength(seededNames.length);
  });

  it('filters by permission slug', async () => {
    const result = await listRoles(testContext(), params({ permission: permA.slug }));

    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.name).sort()).toEqual(
      [`${scope}_alpha`, `${scope}_rich`].sort(),
    );
  });

  it('matches the search against the slug as well as the name', async () => {
    const suffix = '_14';
    const result = await listRoles(testContext(), params({ q: `${scope}${suffix}` }));

    expect(result.total).toBe(1);
    expect(result.items[0]?.slug).toBe(`${scope}${suffix}`);
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

describe('getRoleBySlug', () => {
  it('returns the role with permissions grouped and sorted by name', async () => {
    const slug = slugOf(`${scope}_rich`);
    const result = await getRoleBySlug(testContext(), slug);

    if (result === null) {
      throw new Error('Expected the seeded role to be found');
    }

    expect(result.slug).toBe(slug);
    expect(result.name).toBe(`${scope}_rich`);
    expect(result.description).toBeNull();
    expect(result.permissionsByType.access.map((item) => item.slug)).toEqual([
      permA.slug,
      permC.slug,
    ]);
    expect(result.permissionsByType.action.map((item) => item.slug)).toEqual([permB.slug]);
    expect(result.permissionsByType.view).toEqual([]);
  });

  it('returns empty groups for a role without permissions', async () => {
    const result = await getRoleBySlug(testContext(), slugOf(`${scope}_role_01`));

    expect(result?.permissionsByType).toEqual({ access: [], action: [], view: [] });
  });

  it('returns null for an unknown slug', async () => {
    expect(await getRoleBySlug(testContext(), `${scope}_missing`)).toBeNull();
  });
});
