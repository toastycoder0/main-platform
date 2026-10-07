'use server';

import { randomBytes } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import type { RequestContext } from '@/infrastructure/context/types';
import type { DatabaseClient } from '@/infrastructure/db';
import { permission, role, rolePermission, userRole } from '@/infrastructure/db/schema';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import { slugifyRoleName } from '../application/roles.slug';
import { createRoleSchema, updateRoleSchema } from '../application/roles.validation';

function dedupePermissionIds(permissionIds: string[]): string[] {
  return [...new Set(permissionIds)];
}

async function assertPermissionIdsExist(
  ctx: RequestContext,
  requestedIds: string[],
): Promise<void> {
  const knownPermissions = await ctx.db
    .select({ id: permission.id })
    .from(permission)
    .where(inArray(permission.id, requestedIds));

  if (knownPermissions.length !== requestedIds.length) {
    ctx.logger.warn(
      { count: requestedIds.length - knownPermissions.length },
      'Role payload referenced unknown permission ids',
    );
    throw new AppError('invalid_input', 'La lista de permisos contiene elementos inválidos');
  }
}

async function resolveUniqueRoleSlug(db: DatabaseClient, base: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;
    const [existing] = await db
      .select({ slug: role.slug })
      .from(role)
      .where(eq(role.slug, candidate))
      .limit(1);

    if (!existing) {
      return candidate;
    }
  }

  throw new AppError('internal', 'No se pudo generar un slug único para el rol');
}

export const createRole = run(
  { permission: PERMISSIONS.admin.roles.create, input: createRoleSchema },
  async (ctx, { name, description, permissionIds }) => {
    const requestedIds = dedupePermissionIds(permissionIds);
    await assertPermissionIdsExist(ctx, requestedIds);

    const slug = await resolveUniqueRoleSlug(ctx.db, slugifyRoleName(name) || 'rol');

    await ctx.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(role)
        .values({ slug, name, description: description || null })
        .returning({ id: role.id });

      if (!inserted) {
        throw new AppError('internal', 'No se pudo crear el rol');
      }

      await tx
        .insert(rolePermission)
        .values(requestedIds.map((permissionId) => ({ roleId: inserted.id, permissionId })));
    });

    redirect('/dashboard/roles');
  },
);

export const updateRole = run(
  { permission: PERMISSIONS.admin.roles.edit, input: updateRoleSchema },
  async (ctx, { id, name, description, permissionIds }) => {
    if (!ctx.session) {
      throw new AppError('unauthorized');
    }

    const [existingRole] = await ctx.db
      .select({ id: role.id })
      .from(role)
      .where(eq(role.id, id))
      .limit(1);

    if (!existingRole) {
      throw new AppError('not_found');
    }

    const requestedIds = dedupePermissionIds(permissionIds);
    await assertPermissionIdsExist(ctx, requestedIds);

    const currentPermissionRows = await ctx.db
      .select({ permissionId: rolePermission.permissionId })
      .from(rolePermission)
      .where(eq(rolePermission.roleId, id));
    const currentPermissionIds = new Set(currentPermissionRows.map((item) => item.permissionId));

    const actorRoleRows = await ctx.db
      .select({ roleId: userRole.roleId })
      .from(userRole)
      .where(eq(userRole.userId, ctx.session.user.id));
    const isOwnRole = actorRoleRows.some((item) => item.roleId === id);

    if (isOwnRole) {
      const removed = [...currentPermissionIds].filter(
        (permissionId) => !requestedIds.includes(permissionId),
      );

      if (removed.length > 0) {
        ctx.logger.warn(
          { roleId: id, count: removed.length },
          'Blocked permission removal from own role',
        );
        throw new AppError('forbidden', 'No puedes quitar permisos de tu propio rol');
      }
    }

    await ctx.db.transaction(async (tx) => {
      await tx
        .update(role)
        .set({ name, description: description || null })
        .where(eq(role.id, id));

      await tx.delete(rolePermission).where(eq(rolePermission.roleId, id));

      await tx
        .insert(rolePermission)
        .values(requestedIds.map((permissionId) => ({ roleId: id, permissionId })));
    });

    redirect('/dashboard/roles');
  },
);
