'use server';

import { isAPIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Result } from '@/shared/result';
import { fail, ok } from '@/shared/result';
import { loginSchema } from '../application/auth.validation';
import { auth } from './auth.config';

export async function login(data: unknown): Promise<Result> {
  const parsed = loginSchema.safeParse(data);

  if (!parsed.success) {
    return fail('Datos inválidos');
  }

  const { email, password } = parsed.data;

  try {
    await auth.api.signInEmail({
      body: { email, password, rememberMe: true },
      headers: await headers(),
    });

    return ok(undefined);
  } catch (error) {
    if (isAPIError(error) && error.status === 'UNAUTHORIZED') {
      return fail('Credenciales inválidas');
    }
    return fail('Error al iniciar sesión');
  }
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() });

  redirect('/auth/login');
}
