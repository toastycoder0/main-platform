import crypto from 'node:crypto';
import type { DatabaseClient } from '@/infrastructure/db';
import type { ILogger } from '@/infrastructure/logger/types';
import { resolveUserPermissions } from '@/infrastructure/permissions/resolve';
import { mapSession } from './session-mapper';
import type { AuthApi, RequestContext } from './types';

interface BuildDeps {
  db: DatabaseClient;
  auth: AuthApi;
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
