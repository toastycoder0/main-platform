'use server';

import { isAPIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { run } from '@/infrastructure/services/next-action';
import { AppError } from '@/shared/errors';
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from '../application/auth.validation';
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

      if (isAPIError(error) && error.status === 'FORBIDDEN') {
        throw new AppError('forbidden', 'Tu cuenta está suspendida. Contacta al administrador.');
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

export const requestPasswordReset = run(
  { access: 'public', input: forgotPasswordSchema },
  async (ctx, { email }) => {
    try {
      await auth.api.requestPasswordReset({
        body: { email },
      });
    } catch (error) {
      // Deliberately generic response: never reveals whether the email exists.
      ctx.logger.error({ err: error }, 'better-auth requestPasswordReset failed');
    }
  },
);

export const resetPasswordWithToken = run(
  { access: 'public', input: resetPasswordSchema },
  async (ctx, { token, newPassword }) => {
    try {
      await auth.api.resetPassword({
        body: { token, newPassword },
      });
    } catch (error) {
      if (isAPIError(error) && error.status === 'BAD_REQUEST') {
        throw new AppError('invalid_input', 'El enlace no es válido o expiró. Solicita uno nuevo.');
      }

      ctx.logger.error({ err: error }, 'better-auth resetPassword failed');
      throw new AppError('internal', 'No se pudo restablecer la contraseña');
    }

    redirect('/auth/login');
  },
);
