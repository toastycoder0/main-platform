'use server';

import { isAPIError } from 'better-auth/api';
import { and, eq, ne } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { RequestContext } from '@/infrastructure/context/types';
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

function requireSession(ctx: RequestContext) {
  if (!ctx.session) {
    throw new AppError('unauthorized');
  }

  return ctx.session;
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

  redirect('/account');
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

  redirect('/account/security');
});

export const saveOwnAddresses = run({ input: accountAddressesSchema }, async (ctx, data) => {
  const active = requireSession(ctx);

  await ctx.db.transaction(async (tx) => {
    await syncUserAddresses(tx, active.user.id, data.addresses);
  });

  redirect('/account/addresses');
});

export const saveOwnTaxProfiles = run({ input: accountTaxProfilesSchema }, async (ctx, data) => {
  const active = requireSession(ctx);

  await ctx.db.transaction(async (tx) => {
    await syncUserTaxProfiles(tx, active.user.id, data.taxProfiles);
  });

  redirect('/account/billing');
});
