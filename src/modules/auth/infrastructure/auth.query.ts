import { headers } from 'next/headers';
import type { SessionDTO } from '../application/auth.dto';
import { auth } from './auth.config';

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
