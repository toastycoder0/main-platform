'use server';

import { isAPIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { run } from '@/infrastructure/services/action';
import { AppError } from '@/shared/errors';
import { loginSchema } from '../application/auth.validation';
import { auth } from './auth.config';

export const login = run(
  { access: 'public', input: loginSchema },
  async (_ctx, { email, password }) => {
    try {
      await auth.api.signInEmail({
        body: { email, password, rememberMe: true },
        headers: await headers(),
      });
    } catch (error) {
      if (isAPIError(error) && error.status === 'UNAUTHORIZED') {
        throw new AppError('unauthorized', 'Credenciales inválidas');
      }

      throw new AppError('internal', 'Error al iniciar sesión');
    }

    redirect('/');
  },
);

export const logout = run({}, async (_ctx) => {
  await auth.api.signOut({ headers: await headers() });

  redirect('/auth/login');
});
