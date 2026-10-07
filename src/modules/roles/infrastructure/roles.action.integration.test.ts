import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { permission, role, rolePermission, user, userRole } from '@/infrastructure/db/schema';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { createRole, updateRole } from './roles.action';

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
    permissions: new Set([PERMISSIONS.admin.roles.edit, PERMISSIONS.admin.roles.create]),
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

async function findRolesByName(
  name: string,
): Promise<{ id: string; slug: string; description: string | null }[]> {
  const rows = await db
    .select({ id: role.id, slug: role.slug, description: role.description })
    .from(role)
    .where(eq(role.name, name));

  return rows;
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

describe('createRole', () => {
  it('creates a role with permissions and a slug derived from the name', async () => {
    const name = `${scope} Gerente De Compras`;

    const resultPromise = createRole({
      name,
      description: 'Encargado de compras',
      permissionIds: [permAId, permBId],
    });

    await expect(resultPromise).rejects.toThrow();

    const [created] = await findRolesByName(name);
    expect(created?.slug).toBe(`${scope}-gerente-de-compras`);
    expect(created?.description).toBe('Encargado de compras');

    if (created) {
      createdRoleIds.push(created.id);
      expect((await assignedPermissionIds(created.id)).toSorted()).toEqual(
        [permAId, permBId].toSorted(),
      );
    }
  });

  it('generates a suffixed slug when the base slug is already taken', async () => {
    const name = `${scope} Slug Repetido`;

    await expect(
      createRole({ name, description: null, permissionIds: [permAId] }),
    ).rejects.toThrow();

    const rows = await findRolesByName(name);
    const [first] = rows;
    expect(first?.slug).toBe(`${scope}-slug-repetido`);
    if (first) {
      createdRoleIds.push(first.id);
    }

    await expect(
      createRole({ name, description: null, permissionIds: [permBId] }),
    ).rejects.toThrow();

    const all = await findRolesByName(name);
    expect(all).toHaveLength(2);

    const second = all.find((item) => item.id !== first?.id);
    expect(second?.slug.startsWith(`${scope}-slug-repetido-`)).toBe(true);
    if (second) {
      createdRoleIds.push(second.id);
    }
  });

  it('rejects unknown permission ids without creating the role', async () => {
    const name = `${scope} Invalid`;

    const result = await createRole({
      name,
      description: null,
      permissionIds: ['perm_does_not_exist'],
    });

    expect(result).toEqual({
      success: false,
      error: 'La lista de permisos contiene elementos inválidos',
    });
    expect(await findRolesByName(name)).toEqual([]);
  });

  it('rejects an empty permission list through schema validation', async () => {
    const result = await createRole({
      name: `${scope} Empty`,
      description: null,
      permissionIds: [],
    });

    expect(result).toEqual({ success: false, error: 'Datos inválidos' });
  });

  it('rejects creation when the actor lacks the create permission', async () => {
    state.ctx = {
      ...testContext(),
      permissions: new Set([PERMISSIONS.admin.roles.edit]),
    };

    const result = await createRole({
      name: `${scope} Forbidden`,
      description: null,
      permissionIds: [permAId],
    });

    expect(result).toEqual({
      success: false,
      error: 'No tienes permiso para realizar esta acción',
    });
  });
});
