import type { DatabaseClient } from '@/infrastructure/db';
import type { user } from '@/infrastructure/db/schema';
import type { ILogger } from '@/infrastructure/logger/types';

export type SessionUser = Pick<
  typeof user.$inferSelect,
  'id' | 'email' | 'firstName' | 'lastName'
> & { name: string };

export interface RawBetterAuthUser {
  id: string;
  email: string;
  name: string;
  lastName: string;
}

export interface RawBetterAuthSession {
  id: string;
  expiresAt: Date;
}

export interface AuthApi {
  api: {
    getSession(options: { headers: Headers }): Promise<{
      user: RawBetterAuthUser;
      session: RawBetterAuthSession;
    } | null>;
  };
}

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
