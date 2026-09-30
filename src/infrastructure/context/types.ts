import type { DatabaseClient } from '@/infrastructure/db';
import type { user } from '@/infrastructure/db/schema';
import type { ILogger } from '@/infrastructure/logger/types';

export type SessionUser = Pick<
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
  logger: ILogger;
  requestId: string;
}
