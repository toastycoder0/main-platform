import { describe, expect, it } from 'vitest';
import { db } from '@/shared/db';
import {
  permission,
  role,
  rolePermission,
  user,
  userPermission,
  userRole,
} from '@/shared/db/schema';
import { resolveUserPermissions } from './resolve';

let counter = 0;

function unique(slug: string): string {
  counter += 1;
  return `${slug}_${counter}`;
}

async function seedUser(): Promise<string> {
  counter += 1;
  const id = counter;
  const inserted = await db
    .insert(user)
    .values({ firstName: `Test${id}`, lastName: 'User', email: `test${id}@example.com` })
    .returning({ id: user.id });
  const row = inserted.at(0);
  if (!row) {
    throw new Error('Failed to create test user');
  }
  return row.id;
}

async function seedPermission(
  slug: string,
  type: 'access' | 'action' | 'view',
): Promise<{ id: string; slug: string }> {
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

async function seedRole(permIds: string[]): Promise<string> {
  const roleSlug = unique('role');
  const inserted = await db
    .insert(role)
    .values({ slug: roleSlug, name: roleSlug })
    .returning({ id: role.id });
  const roleRow = inserted.at(0);
  if (!roleRow) {
    throw new Error('Failed to create test role');
  }
  const roleId = roleRow.id;
  if (permIds.length > 0) {
    await db.insert(rolePermission).values(permIds.map((p) => ({ roleId, permissionId: p })));
  }
  return roleId;
}

describe('resolveUserPermissions', () => {
  it('returns permissions from the user role', async () => {
    const userId = await seedUser();
    const perm = await seedPermission(unique('section'), 'access');
    const roleId = await seedRole([perm.id]);
    await db.insert(userRole).values({ userId, roleId });

    const result = await resolveUserPermissions(db, userId);

    expect(result.has(perm.slug)).toBe(true);
  });

  it('does not return unassigned permissions', async () => {
    const userId = await seedUser();
    await seedPermission(unique('section_a'), 'access');
    await seedPermission(unique('section_b'), 'access');
    const roleId = await seedRole([]);
    await db.insert(userRole).values({ userId, roleId });

    const result = await resolveUserPermissions(db, userId);

    expect(result.has('section_a')).toBe(false);
    expect(result.has('section_b')).toBe(false);
  });

  it('allow override adds a permission the role does not have', async () => {
    const userId = await seedUser();
    const perm = await seedPermission(unique('action'), 'action');
    const roleId = await seedRole([]);
    await db.insert(userRole).values({ userId, roleId });
    await db.insert(userPermission).values({ userId, permissionId: perm.id, effect: 'allow' });

    const result = await resolveUserPermissions(db, userId);

    expect(result.has(perm.slug)).toBe(true);
  });

  it('deny override removes a permission the role has', async () => {
    const userId = await seedUser();
    const perm = await seedPermission(unique('action'), 'action');
    const roleId = await seedRole([perm.id]);
    await db.insert(userRole).values({ userId, roleId });
    await db.insert(userPermission).values({ userId, permissionId: perm.id, effect: 'deny' });

    const result = await resolveUserPermissions(db, userId);

    expect(result.has(perm.slug)).toBe(false);
  });

  it('deny wins over allow', async () => {
    const userId = await seedUser();
    const perm = await seedPermission(unique('section'), 'access');
    const roleId = await seedRole([perm.id]);
    await db.insert(userRole).values({ userId, roleId });
    await db.insert(userPermission).values({ userId, permissionId: perm.id, effect: 'deny' });

    const result = await resolveUserPermissions(db, userId);

    expect(result.has(perm.slug)).toBe(false);
  });

  it('expired deny override is ignored', async () => {
    const userId = await seedUser();
    const perm = await seedPermission(unique('action'), 'action');
    const roleId = await seedRole([perm.id]);
    await db.insert(userRole).values({ userId, roleId });

    const yesterday = new Date(Date.now() - 86400000);
    await db.insert(userPermission).values({
      userId,
      permissionId: perm.id,
      effect: 'deny',
      expiresAt: yesterday,
    });

    const result = await resolveUserPermissions(db, userId);

    expect(result.has(perm.slug)).toBe(true);
  });

  it('merges permissions from multiple roles', async () => {
    const userId = await seedUser();
    const permA = await seedPermission(unique('section'), 'access');
    const permB = await seedPermission(unique('action'), 'action');

    const roleA = await seedRole([permA.id]);
    const roleB = await seedRole([permB.id]);
    await db.insert(userRole).values({ userId, roleId: roleA });
    await db.insert(userRole).values({ userId, roleId: roleB });

    const result = await resolveUserPermissions(db, userId);

    expect(result.has(permA.slug)).toBe(true);
    expect(result.has(permB.slug)).toBe(true);
  });

  it('returns empty set for a user with no roles', async () => {
    const userId = await seedUser();

    const result = await resolveUserPermissions(db, userId);

    expect(result.size).toBe(0);
  });
});
