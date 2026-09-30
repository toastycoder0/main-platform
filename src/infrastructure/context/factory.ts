import crypto from 'node:crypto';
import type { DatabaseClient } from '@/infrastructure/db';
import type { ILogger } from '@/infrastructure/logger/types';
import { resolveUserPermissions } from '@/infrastructure/permissions/resolve';
import { mapSession } from './session-mapper';
import type { RequestContext } from './types';

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
  logger: ILogger;
  headers: Headers;
}

export async function buildRequestContext(deps: BuildDeps): Promise<RequestContext> {
  const requestId = crypto.randomUUID();

  const betterAuthSession = await deps.auth.api.getSession({ headers: deps.headers });

  const session = betterAuthSession ? mapSession(betterAuthSession) : null;

  const permissions = session
    ? await resolveUserPermissions(deps.db, session.user.id)
    : new Set<string>();

  return {
    db: deps.db,
    session,
    permissions,
    logger: deps.logger.child({ requestId }),
    requestId,
  };
}
