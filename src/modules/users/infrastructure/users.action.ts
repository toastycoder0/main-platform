'use server';

import { isAPIError } from 'better-auth/api';
import { and, eq, inArray, isNull, like, ne, sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { RequestContext } from '@/infrastructure/context/types';
import type { DatabaseClient } from '@/infrastructure/db';
import {
  permission,
  role,
  rolePermission,
  session,
  user,
  userPermission,
  userRole,
} from '@/infrastructure/db/schema';
import { run } from '@/infrastructure/services/next-action';
import { auth } from '@/modules/auth/infrastructure/auth.config';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import type {
  AddressSchema,
  PermissionOverrideSchema,
  TaxProfileSchema,
} from '../application/users.validation';
import {
  adminResetPasswordSchema,
  banUserSchema,
  createUserSchema,
  updateUserSchema,
  userParamsSchema,
} from '../application/users.validation';
import { syncUserAddresses, syncUserTaxProfiles } from './users.collections';
import { resolveTaxProfileFiles } from './users.files';

type DbLike = Pick<DatabaseClient, 'select' | 'insert' | 'update' | 'delete'>;

interface RelationsPayload {
  roleIds: string[];
  overrides: PermissionOverrideSchema[];
  addresses: AddressSchema[];
  taxProfiles: TaxProfileSchema[];
}

function dedupeRoleIds(roleIds: string[]): string[] {
  return [...new Set(roleIds)];
}

function dedupeOverrides(overrides: PermissionOverrideSchema[]): PermissionOverrideSchema[] {
  const seen = new Set<string>();

  return overrides.filter((item) => {
    if (seen.has(item.permissionId)) {
      return false;
    }

    seen.add(item.permissionId);
    return true;
  });
}

async function assertRoleIdsExist(db: DbLike, requestedIds: string[]): Promise<void> {
  if (requestedIds.length === 0) {
    return;
  }

  const known = await db.select({ id: role.id }).from(role).where(inArray(role.id, requestedIds));

  if (known.length !== requestedIds.length) {
    throw new AppError('invalid_input', 'La lista de roles contiene elementos inválidos');
  }
}

async function assertPermissionIdsExist(db: DbLike, requestedIds: string[]): Promise<void> {
  if (requestedIds.length === 0) {
    return;
  }

  const known = await db
    .select({ id: permission.id })
    .from(permission)
    .where(inArray(permission.id, requestedIds));

  if (known.length !== requestedIds.length) {
    throw new AppError('invalid_input', 'La lista de permisos contiene elementos inválidos');
  }
}

async function assertEmailAvailable(
  db: DbLike,
  email: string,
  excludeUserId?: string,
): Promise<void> {
  const match = sql`lower(${user.email}) = lower(${email})`;
  const where = excludeUserId
    ? and(isNull(user.deletedAt), match, ne(user.id, excludeUserId))
    : and(isNull(user.deletedAt), match);
  const existing = await db.select({ id: user.id }).from(user).where(where).limit(1);

  if (existing[0]) {
    throw new AppError('invalid_input', 'El correo ya está registrado');
  }
}

async function resolveBetterAuthRole(db: DbLike, roleIds: string[]): Promise<'admin' | 'user'> {
  if (roleIds.length === 0) {
    return 'user';
  }

  const granted = await db
    .select({ slug: permission.slug })
    .from(rolePermission)
    .innerJoin(permission, eq(permission.id, rolePermission.permissionId))
    .where(and(inArray(rolePermission.roleId, roleIds), like(permission.slug, 'admin.%')));

  return granted.length > 0 ? 'admin' : 'user';
}

async function syncUserRelations(
  db: DbLike,
  userId: string,
  data: RelationsPayload,
): Promise<void> {
  await db.delete(userRole).where(eq(userRole.userId, userId));

  if (data.roleIds.length > 0) {
    await db.insert(userRole).values(data.roleIds.map((roleId) => ({ userId, roleId })));
  }

  await db.delete(userPermission).where(eq(userPermission.userId, userId));

  if (data.overrides.length > 0) {
    await db.insert(userPermission).values(
      data.overrides.map((item) => ({
        userId,
        permissionId: item.permissionId,
        effect: item.effect,
        expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
      })),
    );
  }

  await syncUserAddresses(db, userId, data.addresses);
  await syncUserTaxProfiles(db, userId, data.taxProfiles);
}

function toRelationsPayload(data: {
  roleIds: string[];
  overrides: PermissionOverrideSchema[];
  addresses: AddressSchema[];
  taxProfiles: TaxProfileSchema[];
}): RelationsPayload {
  return {
    roleIds: dedupeRoleIds(data.roleIds),
    overrides: dedupeOverrides(data.overrides),
    addresses: data.addresses,
    taxProfiles: data.taxProfiles,
  };
}

function failCreateUser(error: unknown, ctx: RequestContext): never {
  ctx.logger.error({ err: error }, 'better-auth createUser failed');

  if (isAPIError(error) && error.status === 'BAD_REQUEST') {
    throw new AppError('invalid_input', 'El correo ya está registrado');
  }

  throw new AppError('internal', 'No se pudo crear el usuario');
}

function failUpdateUser(error: unknown, ctx: RequestContext, userId: string): never {
  ctx.logger.error({ err: error, userId }, 'better-auth adminUpdateUser failed');
  if (isAPIError(error)) {
    if (error.status === 'UNAUTHORIZED') {
      throw new AppError('unauthorized');
    }

    if (error.status === 'FORBIDDEN') {
      throw new AppError(
        'forbidden',
        'Tu cuenta no tiene privilegios suficientes en el sistema de autenticación',
      );
    }

    if (error.status === 'NOT_FOUND') {
      throw new AppError('not_found');
    }

    if (error.status === 'BAD_REQUEST') {
      throw new AppError('invalid_input', 'No se pudieron guardar los datos del usuario');
    }
  }

  throw new AppError('internal', 'No se pudo actualizar el usuario');
}

export const createUser = run(
  { permission: PERMISSIONS.admin.users.create, input: createUserSchema },
  async (ctx, data) => {
    const relations = toRelationsPayload(data);

    await assertRoleIdsExist(ctx.db, relations.roleIds);
    await assertPermissionIdsExist(
      ctx.db,
      relations.overrides.map((item) => item.permissionId),
    );
    await assertEmailAvailable(ctx.db, data.email);

    const betterAuthRole = await resolveBetterAuthRole(ctx.db, relations.roleIds);

    let createdId: string;

    try {
      const created = await auth.api.createUser({
        body: {
          email: data.email,
          password: data.password || undefined,
          name: data.firstName,
          data: { lastName: data.lastName },
          role: betterAuthRole,
        },
      });
      createdId = created.user.id;
    } catch (error) {
      failCreateUser(error, ctx);
    }

    await resolveTaxProfileFiles(createdId, data.taxProfiles);

    try {
      await ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .select({ value: sql<number>`coalesce(max(${user.sortOrder}), -1)` })
          .from(user);

        await tx
          .update(user)
          .set({ sortOrder: (row?.value ?? -1) + 1 })
          .where(eq(user.id, createdId));

        await syncUserRelations(tx, createdId, relations);
      });
    } catch (error) {
      ctx.logger.error({ err: error, userId: createdId }, 'User relations insert failed');

      try {
        await ctx.db.delete(user).where(eq(user.id, createdId));
        ctx.logger.warn({ userId: createdId }, 'Rolled back partially created user');
      } catch (cleanupError) {
        ctx.logger.error(
          { err: cleanupError, userId: createdId },
          'Failed to rollback partially created user',
        );
      }

      throw error;
    }

    redirect('/dashboard/users');
  },
);

export const updateUser = run(
  { permission: PERMISSIONS.admin.users.edit, input: updateUserSchema },
  async (ctx, data) => {
    if (ctx.session.user.id === data.id) {
      throw new AppError('forbidden', 'No puedes editar tu propio usuario; usa tu perfil');
    }

    const existing = await ctx.db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.id, data.id), isNull(user.deletedAt)))
      .limit(1);

    if (!existing[0]) {
      throw new AppError('not_found');
    }

    const relations = toRelationsPayload(data);

    await assertRoleIdsExist(ctx.db, relations.roleIds);
    await assertPermissionIdsExist(
      ctx.db,
      relations.overrides.map((item) => item.permissionId),
    );
    await assertEmailAvailable(ctx.db, data.email, data.id);

    const betterAuthRole = await resolveBetterAuthRole(ctx.db, relations.roleIds);

    try {
      await auth.api.adminUpdateUser({
        body: {
          userId: data.id,
          data: {
            name: data.firstName,
            lastName: data.lastName,
            email: data.email,
            role: betterAuthRole,
          },
        },
        headers: await headers(),
      });
    } catch (error) {
      failUpdateUser(error, ctx, data.id);
    }

    await resolveTaxProfileFiles(data.id, data.taxProfiles);

    await ctx.db.transaction(async (tx) => {
      await syncUserRelations(tx, data.id, relations);
    });

    redirect('/dashboard/users');
  },
);

function failBetterAuthAdmin(
  error: unknown,
  ctx: RequestContext,
  userId: string,
  operation: string,
): never {
  ctx.logger.error({ err: error, userId, operation }, 'better-auth admin endpoint failed');

  if (isAPIError(error)) {
    if (error.status === 'UNAUTHORIZED') {
      throw new AppError('unauthorized');
    }

    if (error.status === 'FORBIDDEN') {
      throw new AppError(
        'forbidden',
        'Tu cuenta no tiene privilegios suficientes en el sistema de autenticación',
      );
    }

    if (error.status === 'NOT_FOUND') {
      throw new AppError('not_found');
    }

    if (error.status === 'BAD_REQUEST') {
      throw new AppError('invalid_input', 'No se pudo completar la operación');
    }
  }

  throw new AppError('internal', 'No se pudo completar la operación');
}

async function assertUserExists(db: DbLike, id: string): Promise<void> {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.id, id), isNull(user.deletedAt)))
    .limit(1);

  if (!rows[0]) {
    throw new AppError('not_found');
  }
}

export const banUser = run(
  { permission: PERMISSIONS.admin.users.ban, input: banUserSchema },
  async (ctx, data) => {
    if (ctx.session.user.id === data.id) {
      throw new AppError('forbidden', 'No puedes banear tu propia cuenta');
    }

    await assertUserExists(ctx.db, data.id);

    try {
      await auth.api.banUser({
        body: {
          userId: data.id,
          banReason: data.reason,
          ...(data.expiresInDays !== null ? { banExpiresIn: data.expiresInDays * 86_400 } : {}),
        },
        headers: await headers(),
      });
    } catch (error) {
      failBetterAuthAdmin(error, ctx, data.id, 'banUser');
    }

    redirect(`/dashboard/users/form/${data.id}`);
  },
);

export const unbanUser = run(
  { permission: PERMISSIONS.admin.users.ban, input: userParamsSchema },
  async (ctx, data) => {
    if (ctx.session.user.id === data.id) {
      throw new AppError('forbidden', 'No puedes modificar tu propia cuenta');
    }

    await assertUserExists(ctx.db, data.id);

    try {
      await auth.api.unbanUser({ body: { userId: data.id }, headers: await headers() });
    } catch (error) {
      failBetterAuthAdmin(error, ctx, data.id, 'unbanUser');
    }

    redirect(`/dashboard/users/form/${data.id}`);
  },
);

export const adminResetPassword = run(
  { permission: PERMISSIONS.admin.users.edit, input: adminResetPasswordSchema },
  async (ctx, data) => {
    if (ctx.session.user.id === data.id) {
      throw new AppError('forbidden', 'Cambia tu contraseña desde tu perfil');
    }

    await assertUserExists(ctx.db, data.id);

    try {
      await auth.api.setUserPassword({
        body: { userId: data.id, newPassword: data.newPassword },
        headers: await headers(),
      });
    } catch (error) {
      failBetterAuthAdmin(error, ctx, data.id, 'setUserPassword');
    }

    try {
      await auth.api.revokeUserSessions({ body: { userId: data.id }, headers: await headers() });
    } catch (error) {
      ctx.logger.warn({ err: error, userId: data.id }, 'Failed to revoke sessions after reset');
    }

    redirect(`/dashboard/users/form/${data.id}`);
  },
);

export const deleteUser = run(
  { permission: PERMISSIONS.admin.users.delete, input: userParamsSchema },
  async (ctx, data) => {
    if (ctx.session.user.id === data.id) {
      throw new AppError('forbidden', 'No puedes eliminar tu propia cuenta');
    }

    await assertUserExists(ctx.db, data.id);

    await ctx.db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({
          deletedAt: new Date(),
          email: sql`${user.id} || ':' || ${user.email}`,
          banned: true,
        })
        .where(eq(user.id, data.id));

      await tx.delete(session).where(eq(session.userId, data.id));
    });

    redirect('/dashboard/users');
  },
);
