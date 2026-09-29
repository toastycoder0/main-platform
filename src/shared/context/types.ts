import type { DatabaseClient } from '@/shared/db';
import type { user } from '@/shared/db/schema';
import type { logger } from '@/shared/logger';

type Logger = typeof logger;

type SessionUser = Pick<
  typeof user.$inferSelect,
  'id' | 'email' | 'firstName' | 'lastName' | 'role'
> & { name: string };

export interface RequestContext {
  db: DatabaseClient;
  session: {
    user: SessionUser;
    session: { id: string; expiresAt: Date };
  } | null;
  permissions: Set<string>;
  logger: Logger;
  requestId: string;
}
