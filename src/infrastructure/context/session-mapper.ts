import type { RawBetterAuthSession, RawBetterAuthUser, SessionUser } from './types';

export function mapSessionUser(raw: RawBetterAuthUser): SessionUser {
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.name,
    lastName: raw.lastName,
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
