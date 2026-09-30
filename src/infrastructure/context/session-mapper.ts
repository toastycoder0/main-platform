import type { SessionUser } from './types';

export interface RawBetterAuthUser {
  id: string;
  email: string;
  name: string;
  lastName: string;
  role?: string | null | undefined;
}

export interface RawBetterAuthSession {
  id: string;
  expiresAt: Date;
}

export function mapSessionUser(raw: RawBetterAuthUser): SessionUser {
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.name,
    lastName: raw.lastName,
    role: raw.role ?? null,
    name: `${raw.name} ${raw.lastName}`.trim(),
  };
}

export function mapSession(raw: { user: RawBetterAuthUser; session: RawBetterAuthSession }): {
  user: SessionUser;
  session: { id: string; expiresAt: Date };
} {
  return {
    user: mapSessionUser(raw.user),
    session: {
      id: raw.session.id,
      expiresAt: raw.session.expiresAt,
    },
  };
}
