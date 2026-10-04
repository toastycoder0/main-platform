import type { RequestContext } from '@/infrastructure/context/types';
import { AppError } from '@/shared/errors';

export type AuthenticatedContext = Omit<RequestContext, 'session'> & {
  session: NonNullable<RequestContext['session']>;
};

export function requireAuthenticated(ctx: RequestContext): asserts ctx is AuthenticatedContext {
  if (!ctx.session) {
    throw new AppError('unauthorized');
  }
}

export function requirePermission(ctx: RequestContext, slug: string): void {
  requireAuthenticated(ctx);

  if (!ctx.permissions.has(slug)) {
    throw new AppError('forbidden');
  }
}
