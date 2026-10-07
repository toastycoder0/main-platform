'use server';

import { isAPIError } from 'better-auth/api';
import { and, eq, ne } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { RequestContext } from '@/infrastructure/context/types';
import type { DatabaseClient } from '@/infrastructure/db';
import { session, userAddress, userTaxProfile } from '@/infrastructure/db/schema';
import { run } from '@/infrastructure/services/next-action';
import { auth } from '@/modules/auth/infrastructure/auth.config';
import { AppError } from '@/shared/errors';
import type { AddressSchema, TaxProfileSchema } from '../application/users.validation';
import {
  addressSchema,
  changePasswordSchema,
  MAX_ADDRESSES,
  MAX_TAX_PROFILES,
  profileSchema,
  taxProfileSchema,
  updateAddressSchema,
  updateTaxProfileSchema,
  userParamsSchema,
} from '../application/users.validation';

type DbLike = Pick<DatabaseClient, 'select' | 'insert' | 'update' | 'delete'>;

function requireSession(ctx: RequestContext) {
  if (!ctx.session) {
    throw new AppError('unauthorized');
  }

  return ctx.session;
}

async function assertCollectionLimit(
  db: DbLike,
  table: typeof userAddress | typeof userTaxProfile,
  userId: string,
  limit: number,
  entityLabel: string,
): Promise<void> {
  const rows = await db.select({ id: table.id }).from(table).where(eq(table.userId, userId));

  if (rows.length >= limit) {
    throw new AppError('invalid_input', `No se pueden registrar más de ${limit} ${entityLabel}`);
  }
}

function addressValues(userId: string, data: AddressSchema) {
  return {
    userId,
    name: data.name,
    street: data.street,
    exteriorNumber: data.exteriorNumber,
    interiorNumber: data.interiorNumber || null,
    colony: data.colony,
    municipality: data.municipality,
    state: data.state,
    postalCode: data.postalCode,
    phone: data.phone || null,
    isDefault: data.isDefault,
  };
}

function taxProfileValues(userId: string, data: TaxProfileSchema) {
  return {
    userId,
    alias: data.alias,
    legalName: data.legalName,
    rfc: data.rfc,
    cfdiUse: data.cfdiUse,
    taxRegime: data.taxRegime,
    taxPostalCode: data.taxPostalCode,
    rfcUrl: data.rfcUrl || null,
    isDefault: data.isDefault,
  };
}

async function clearAddressDefaults(tx: DbLike, userId: string, excludeId?: string) {
  const where = excludeId
    ? and(eq(userAddress.userId, userId), ne(userAddress.id, excludeId))
    : eq(userAddress.userId, userId);
  await tx.update(userAddress).set({ isDefault: false }).where(where);
}

async function clearTaxProfileDefaults(tx: DbLike, userId: string, excludeId?: string) {
  const where = excludeId
    ? and(eq(userTaxProfile.userId, userId), ne(userTaxProfile.id, excludeId))
    : eq(userTaxProfile.userId, userId);
  await tx.update(userTaxProfile).set({ isDefault: false }).where(where);
}

export const updateProfile = run({ input: profileSchema }, async (ctx, data) => {
  const active = requireSession(ctx);

  try {
    await auth.api.updateUser({
      body: { name: data.firstName, lastName: data.lastName },
      headers: await headers(),
    });
  } catch (error) {
    ctx.logger.error({ err: error, userId: active.user.id }, 'better-auth updateUser failed');

    if (isAPIError(error) && error.status === 'BAD_REQUEST') {
      throw new AppError('invalid_input', 'No se pudieron actualizar los datos del perfil');
    }

    throw new AppError('internal', 'No se pudo actualizar el perfil');
  }

  redirect('/account?tab=general');
});

export const changeOwnPassword = run({ input: changePasswordSchema }, async (ctx, data) => {
  const active = requireSession(ctx);

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        revokeOtherSessions: false,
      },
      headers: await headers(),
    });
  } catch (error) {
    ctx.logger.error({ err: error, userId: active.user.id }, 'better-auth changePassword failed');

    if (isAPIError(error) && error.status === 'BAD_REQUEST') {
      throw new AppError('invalid_input', 'Verifica la contraseña actual');
    }

    if (isAPIError(error) && error.status === 'UNAUTHORIZED') {
      throw new AppError('unauthorized');
    }

    throw new AppError('internal', 'No se pudo cambiar la contraseña');
  }

  await ctx.db
    .delete(session)
    .where(and(eq(session.userId, active.user.id), ne(session.id, active.session.id)));

  redirect('/account?tab=general');
});

export const createAddress = run({ input: addressSchema }, async (ctx, data) => {
  const active = requireSession(ctx);

  await assertCollectionLimit(ctx.db, userAddress, active.user.id, MAX_ADDRESSES, 'direcciones');

  await ctx.db.transaction(async (tx) => {
    if (data.isDefault) {
      await clearAddressDefaults(tx, active.user.id);
    }

    await tx.insert(userAddress).values(addressValues(active.user.id, data));
  });

  redirect('/account?tab=addresses');
});

export const updateAddress = run({ input: updateAddressSchema }, async (ctx, data) => {
  const active = requireSession(ctx);
  const { id, ...values } = data;

  await ctx.db.transaction(async (tx) => {
    const owned = await tx
      .select({ id: userAddress.id })
      .from(userAddress)
      .where(and(eq(userAddress.id, id), eq(userAddress.userId, active.user.id)))
      .limit(1);

    if (!owned[0]) {
      throw new AppError('not_found');
    }

    if (values.isDefault) {
      await clearAddressDefaults(tx, active.user.id, id);
    }

    await tx
      .update(userAddress)
      .set(addressValues(active.user.id, values))
      .where(eq(userAddress.id, id));
  });

  redirect('/account?tab=addresses');
});

export const deleteAddress = run({ input: userParamsSchema }, async (ctx, data) => {
  const active = requireSession(ctx);

  const deleted = await ctx.db
    .delete(userAddress)
    .where(and(eq(userAddress.id, data.id), eq(userAddress.userId, active.user.id)))
    .returning({ id: userAddress.id });

  if (!deleted[0]) {
    throw new AppError('not_found');
  }

  redirect('/account?tab=addresses');
});

export const createTaxProfile = run({ input: taxProfileSchema }, async (ctx, data) => {
  const active = requireSession(ctx);

  await assertCollectionLimit(
    ctx.db,
    userTaxProfile,
    active.user.id,
    MAX_TAX_PROFILES,
    'perfiles de facturación',
  );

  await ctx.db.transaction(async (tx) => {
    if (data.isDefault) {
      await clearTaxProfileDefaults(tx, active.user.id);
    }

    await tx.insert(userTaxProfile).values(taxProfileValues(active.user.id, data));
  });

  redirect('/account?tab=billing');
});

export const updateTaxProfile = run({ input: updateTaxProfileSchema }, async (ctx, data) => {
  const active = requireSession(ctx);
  const { id, ...values } = data;

  await ctx.db.transaction(async (tx) => {
    const owned = await tx
      .select({ id: userTaxProfile.id })
      .from(userTaxProfile)
      .where(and(eq(userTaxProfile.id, id), eq(userTaxProfile.userId, active.user.id)))
      .limit(1);

    if (!owned[0]) {
      throw new AppError('not_found');
    }

    if (values.isDefault) {
      await clearTaxProfileDefaults(tx, active.user.id, id);
    }

    await tx
      .update(userTaxProfile)
      .set(taxProfileValues(active.user.id, values))
      .where(eq(userTaxProfile.id, id));
  });

  redirect('/account?tab=billing');
});

export const deleteTaxProfile = run({ input: userParamsSchema }, async (ctx, data) => {
  const active = requireSession(ctx);

  const deleted = await ctx.db
    .delete(userTaxProfile)
    .where(and(eq(userTaxProfile.id, data.id), eq(userTaxProfile.userId, active.user.id)))
    .returning({ id: userTaxProfile.id });

  if (!deleted[0]) {
    throw new AppError('not_found');
  }

  redirect('/account?tab=billing');
});
