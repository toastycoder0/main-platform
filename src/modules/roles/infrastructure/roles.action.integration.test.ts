import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { permission, role, rolePermission, user, userRole } from '@/infrastructure/db/schema';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { updateRole } from './roles.action';

const scope = `updrole${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const state = vi.hoisted(() => ({
  ctx: undefined as RequestContext | undefined,
}));

vi.mock('@/infrastructure/context/next-factory', () => ({
  createRequestContext: () => {
    if (!state.ctx) {
      throw new Error('Test context not set');
    }
    return state.ctx;
  },
}));

const createdRoleIds: string[] = [];
const createdUserIds: string[] = [];
const createdPermissionIds: string[] = [];

let actorUserId = '';
let permAId = '';
let permBId = '';

function testContext(): RequestContext {
  const logger: RequestContext['logger'] = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => logger,
  };

  return {
    db,
    session: {
      user: {
        id: actorUserId,
        email: `${scope}@roles-action.test`,
        firstName: 'Roles',
        lastName: 'Action',
        name: 'Roles Action',
      },
      session: { id: 'sess_itest', expiresAt: new Date(Date.now() + 60_000) },
    },
    permissions: new Set([PERMISSIONS.admin.roles.edit]),
    logger,
    requestId: 'itest',
  };
}

async function seedRole(permissionIds: string[]): Promise<string> {
  const slug = `${scope}_role_${createdRoleIds.length + 1}`;
  const inserted = await db.insert(role).values({ slug, name: slug }).returning({ id: role.id });
  const row = inserted.at(0);

  if (!row) {
    throw new Error('Failed to create test role');
  }

  createdRoleIds.push(row.id);

  if (permissionIds.length > 0) {
    await db
      .insert(rolePermission)
      .values(permissionIds.map((permissionId) => ({ roleId: row.id, permissionId })));
  }

  return row.id;
}

async function seedPermission(label: string, type: 'access' | 'action'): Promise<string> {
  const inserted = await db
    .insert(permission)
    .values({ slug: `${scope}.${label}`, name: `${scope}.${label}`, type })
    .returning({ id: permission.id });
  const row = inserted.at(0);

  if (!row) {
    throw new Error('Failed to create test permission');
  }

  createdPermissionIds.push(row.id);
  return row.id;
}

async function assignedPermissionIds(roleId: string): Promise<string[]> {
  const rows = await db
    .select({ permissionId: rolePermission.permissionId })
    .from(rolePermission)
    .where(eq(rolePermission.roleId, roleId));
  return rows.map((item) => item.permissionId);
}

beforeAll(async () => {
  permAId = await seedPermission('a', 'access');
  permBId = await seedPermission('b', 'action');

  const inserted = await db
    .insert(user)
    .values({
      firstName: 'Roles',
      lastName: 'Action',
      email: `${scope}@roles-action.test`,
    })
    .returning({ id: user.id });
  const row = inserted.at(0);

  if (!row) {
    throw new Error('Failed to create test user');
  }

  actorUserId = row.id;
  createdUserIds.push(row.id);
});

beforeEach(() => {
  state.ctx = testContext();
});

afterAll(async () => {
  if (createdRoleIds.length > 0) {
    await db.delete(role).where(inArray(role.id, createdRoleIds));
  }
  if (createdPermissionIds.length > 0) {
    await db.delete(permission).where(inArray(permission.id, createdPermissionIds));
  }
  if (createdUserIds.length > 0) {
    await db.delete(user).where(inArray(user.id, createdUserIds));
  }
});

describe('updateRole', () => {
  it('updates role fields and replaces permissions for a foreign role', async () => {
    const roleId = await seedRole([permAId]);

    const resultPromise = updateRole({
      id: roleId,
      name: 'Rol renombrado',
      description: 'Descripción nueva',
      permissionIds: [permAId, permBId],
    });

    await expect(resultPromise).rejects.toThrow();

    const [updated] = await db
      .select({ name: role.name, description: role.description })
      .from(role)
      .where(eq(role.id, roleId))
      .limit(1);
    expect(updated?.name).toBe('Rol renombrado');
    expect(updated?.description).toBe('Descripción nueva');
    expect((await assignedPermissionIds(roleId)).toSorted()).toEqual([permAId, permBId].toSorted());
  });

  it('allows adding permissions to the actor own role', async () => {
    const roleId = await seedRole([permAId]);
    await db.insert(userRole).values({ userId: actorUserId, roleId });

    const resultPromise = updateRole({
      id: roleId,
      name: `${scope}_role_own`,
      description: null,
      permissionIds: [permAId, permBId],
    });

    await expect(resultPromise).rejects.toThrow();
    expect((await assignedPermissionIds(roleId)).toSorted()).toEqual([permAId, permBId].toSorted());
  });

  it('rejects removing permissions from the actor own role', async () => {
    const roleId = await seedRole([permAId, permBId]);
    await db.insert(userRole).values({ userId: actorUserId, roleId });

    const result = await updateRole({
      id: roleId,
      name: `${scope}_role_own`,
      description: null,
      permissionIds: [permAId],
    });

    expect(result).toEqual({
      success: false,
      error: 'No puedes quitar permisos de tu propio rol',
    });
    expect((await assignedPermissionIds(roleId)).toSorted()).toEqual([permAId, permBId].toSorted());
  });

  it('allows removing permissions from a foreign role', async () => {
    const roleId = await seedRole([permAId, permBId]);

    const resultPromise = updateRole({
      id: roleId,
      name: `${scope}_role_foreign`,
      description: null,
      permissionIds: [permAId],
    });

    await expect(resultPromise).rejects.toThrow();
    expect(await assignedPermissionIds(roleId)).toEqual([permAId]);
  });

  it('rejects unknown permission ids without touching the database', async () => {
    const roleId = await seedRole([permAId]);

    const result = await updateRole({
      id: roleId,
      name: `${scope}_role_invalid`,
      description: null,
      permissionIds: [permAId, 'perm_does_not_exist'],
    });

    expect(result).toEqual({
      success: false,
      error: 'La lista de permisos contiene elementos inválidos',
    });
    expect(await assignedPermissionIds(roleId)).toEqual([permAId]);
  });

  it('rejects an empty permission list through schema validation', async () => {
    const roleId = await seedRole([permAId]);

    const result = await updateRole({
      id: roleId,
      name: `${scope}_role_empty`,
      description: null,
      permissionIds: [],
    });

    expect(result).toEqual({ success: false, error: 'Datos inválidos' });
    expect(await assignedPermissionIds(roleId)).toEqual([permAId]);
  });

  it('fails with not_found for a missing role', async () => {
    const result = await updateRole({
      id: 'role_does_not_exist',
      name: 'Cualquiera',
      description: null,
      permissionIds: [permAId],
    });

    expect(result).toEqual({ success: false, error: 'El recurso solicitado no existe' });
  });
});
