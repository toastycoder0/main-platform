'use server';

import { eq, inArray } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { permission, role, rolePermission, userRole } from '@/infrastructure/db/schema';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import { updateRoleSchema } from '../application/roles.validation';

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

    const requestedIds = [...new Set(permissionIds)];

    const knownPermissions = await ctx.db
      .select({ id: permission.id })
      .from(permission)
      .where(inArray(permission.id, requestedIds));

    if (knownPermissions.length !== requestedIds.length) {
      ctx.logger.warn({ roleId: id }, 'Update role referenced unknown permission ids');
      throw new AppError('invalid_input', 'La lista de permisos contiene elementos inválidos');
    }

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
