import crypto from 'node:crypto';
import type { DatabaseClient } from '@/shared/db';
import type { logger } from '@/shared/logger';
import { resolveUserPermissions } from '@/shared/permissions/resolve';
import type { RequestContext } from './types';

type Logger = typeof logger;

interface BuildDeps {
  db: DatabaseClient;
  auth: {
    api: {
      getSession: (options: { headers: Headers }) => Promise<{
        user: {
          id: string;
          email: string;
          name: string;
          lastName: string;
          role?: string | null | undefined;
        };
        session: { id: string; expiresAt: Date };
      } | null>;
    };
  };
  logger: Logger;
  headers: Headers;
}

export async function buildRequestContext(deps: BuildDeps): Promise<RequestContext> {
  const requestId = crypto.randomUUID();

  const betterAuthSession = await deps.auth.api.getSession({ headers: deps.headers });

  const session = betterAuthSession
    ? {
        user: {
          id: betterAuthSession.user.id,
          email: betterAuthSession.user.email,
          firstName: betterAuthSession.user.name,
          lastName: betterAuthSession.user.lastName,
          role: betterAuthSession.user.role ?? null,
          name: `${betterAuthSession.user.name} ${betterAuthSession.user.lastName}`.trim(),
        },
        session: {
          id: betterAuthSession.session.id,
          expiresAt: betterAuthSession.session.expiresAt,
        },
      }
    : null;

  const permissions = session
    ? await resolveUserPermissions(deps.db, session.user.id)
    : new Set<string>();

  return {
    db: deps.db,
    session,
    permissions,
    logger: deps.logger.child({ requestId }) as Logger,
    requestId,
  };
}
