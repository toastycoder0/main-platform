import type { SessionUser } from '@/infrastructure/context/types';

export type { SessionUser };

export interface SessionDTO {
  user: SessionUser;
}
