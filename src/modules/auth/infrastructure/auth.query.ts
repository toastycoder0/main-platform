import { headers } from 'next/headers';
import { mapSessionUser } from '@/infrastructure/context/session-mapper';
import type { SessionDTO } from '../application/auth.types';
import { auth } from './auth.config';

export async function getSession(): Promise<SessionDTO | null> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return null;
  }

  return { user: mapSessionUser(session.user) };
}
