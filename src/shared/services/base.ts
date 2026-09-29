import { createRequestContext } from '@/shared/context/next-factory';
import type { RequestContext } from '@/shared/context/types';
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

export function withAuth<TReturn, TData>(
  handler: (ctx: AuthenticatedContext, data: TData) => Promise<TReturn>,
): (data: TData) => Promise<TReturn>;
export function withAuth<TReturn>(
  handler: (ctx: AuthenticatedContext) => Promise<TReturn>,
): () => Promise<TReturn>;
export function withAuth<TReturn, TData = undefined>(
  handler: (ctx: AuthenticatedContext, data?: TData) => Promise<TReturn>,
): (data?: TData) => Promise<TReturn> {
  return async (data?: TData) => {
    const ctx = await createRequestContext();
    requireAuthenticated(ctx);
    return handler(ctx, data);
  };
}
