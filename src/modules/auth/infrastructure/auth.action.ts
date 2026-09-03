'use server';

import { isAPIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginSchema } from '@/modules/auth/application/auth.validation';
import { auth } from '@/shared/auth';

export type LoginResult = { success: boolean; error?: string };

export async function login(data: unknown): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos' };
  }

  const { email, password } = parsed.data;

  try {
    await auth.api.signInEmail({
      body: { email, password, rememberMe: true },
      headers: await headers(),
    });

    return { success: true };
  } catch (error) {
    if (isAPIError(error) && error.status === 'UNAUTHORIZED') {
      return { success: false, error: 'Credenciales inválidas' };
    }
    return { success: false, error: 'Error al iniciar sesión' };
  }
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() });

  redirect('/auth/login');
}
