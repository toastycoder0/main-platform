'use server';

import { isAPIError } from 'better-auth/api';
import { and, eq, ne } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { session } from '@/infrastructure/db/schema';
import { run } from '@/infrastructure/services/next-action';
import { auth } from '@/modules/auth/infrastructure/auth.config';
import { AppError } from '@/shared/errors';
import {
  accountAddressesSchema,
  accountTaxProfilesSchema,
  changePasswordSchema,
  profileSchema,
} from '../application/users.validation';
import { syncUserAddresses, syncUserTaxProfiles } from './users.collections';

export const updateProfile = run({ input: profileSchema }, async (ctx, data) => {
  try {
    await auth.api.updateUser({
      body: { name: data.firstName, lastName: data.lastName },
      headers: await headers(),
    });
  } catch (error) {
    ctx.logger.error({ err: error, userId: ctx.session.user.id }, 'better-auth updateUser failed');

    if (isAPIError(error) && error.status === 'BAD_REQUEST') {
      throw new AppError('invalid_input', 'No se pudieron actualizar los datos del perfil');
    }

    throw new AppError('internal', 'No se pudo actualizar el perfil');
  }

  redirect('/account');
});

export const changeOwnPassword = run({ input: changePasswordSchema }, async (ctx, data) => {
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
    ctx.logger.error(
      { err: error, userId: ctx.session.user.id },
      'better-auth changePassword failed',
    );

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
    .where(and(eq(session.userId, ctx.session.user.id), ne(session.id, ctx.session.session.id)));

  redirect('/account/security');
});

export const saveOwnAddresses = run({ input: accountAddressesSchema }, async (ctx, data) => {
  await ctx.db.transaction(async (tx) => {
    await syncUserAddresses(tx, ctx.session.user.id, data.addresses);
  });

  redirect('/account/addresses');
});

export const saveOwnTaxProfiles = run({ input: accountTaxProfilesSchema }, async (ctx, data) => {
  await ctx.db.transaction(async (tx) => {
    await syncUserTaxProfiles(tx, ctx.session.user.id, data.taxProfiles);
  });

  redirect('/account/billing');
});
