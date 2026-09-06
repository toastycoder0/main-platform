'use server';

import { isAPIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginSchema } from '@/modules/auth/application/auth.validation';
import type { user } from '@/shared/db/schema';
import { auth } from './auth.config';

type SessionUser = Pick<
  typeof user.$inferSelect,
  'id' | 'email' | 'firstName' | 'lastName' | 'role'
>;

export type LoginResult = { success: boolean; error?: string };

export interface SessionDTO {
  user: SessionUser;
}

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

export async function getSession(): Promise<SessionDTO | null> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.name,
      lastName: session.user.lastName,
      role: session.user.role ?? null,
    },
  };
}
