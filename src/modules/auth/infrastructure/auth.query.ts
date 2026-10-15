import { headers } from 'next/headers';
import { auth } from '@/infrastructure/auth/config';
import { mapSessionUser } from '@/infrastructure/context/session-mapper';
import type { SessionDTO } from '../application/auth.types';

export async function getSession(): Promise<SessionDTO | null> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return null;
  }

  return { user: mapSessionUser(session.user) };
}
