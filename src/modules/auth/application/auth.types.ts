import type { user } from '@/shared/db/schema';

type SessionUser = Pick<
  typeof user.$inferSelect,
  'id' | 'email' | 'firstName' | 'lastName' | 'role'
>;

export interface SessionDTO {
  user: SessionUser;
}

export type LoginResult = { success: boolean; error?: string };
