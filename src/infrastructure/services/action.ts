import { z } from 'zod';
import type { RequestContext } from '@/infrastructure/context/types';
import { AppError, isAppError, isNextRedirect } from '@/shared/errors';
import { fail, ok, type Result } from '@/shared/result';

export type AuthenticatedContext = RequestContext & {
  session: NonNullable<RequestContext['session']>;
};

export interface SessionActionConfig<TSchema extends z.ZodType> {
  access?: 'session';
  permission?: string;
  input?: TSchema;
}

export interface PublicActionConfig<TSchema extends z.ZodType> {
  access: 'public';
  permission?: never;
  input?: TSchema;
}

export type ActionConfig<TSchema extends z.ZodType> =
  | SessionActionConfig<TSchema>
  | PublicActionConfig<TSchema>;

interface ActionDeps {
  getContext: () => Promise<RequestContext>;
}

function guardAccess(ctx: RequestContext, config: ActionConfig<z.ZodType>): void {
  const needsIdentity = config.access !== 'public' || config.permission !== undefined;

  if (needsIdentity && !ctx.session) {
    throw new AppError('unauthorized');
  }
  if (config.permission && !ctx.permissions.has(config.permission)) {
    throw new AppError('forbidden');
  }
}

function validateInput<TSchema extends z.ZodType>(
  ctx: RequestContext,
  schema: TSchema | undefined,
  payload: unknown,
): Result<z.infer<TSchema>> {
  const parsed = (schema ?? z.undefined()).safeParse(payload);

  if (!parsed.success) {
    ctx.logger.warn({ issues: parsed.error.issues }, 'Server action input validation failed');
    return fail('Datos inválidos');
  }

  return ok(parsed.data as z.infer<TSchema>);
}

function handleFailure(ctx: RequestContext | undefined, error: unknown): Result {
  if (isNextRedirect(error)) {
    throw error;
  }
  if (isAppError(error)) {
    return fail(error.message);
  }
  ctx?.logger.error({ err: error }, 'Unhandled server action error');
  return fail(new AppError('internal').message);
}

/**
 * Session-scoped configs (the default) guarantee `ctx.session` before the
 * handler runs; public configs may run unauthenticated.
 */
export function executeAction<TSchema extends z.ZodType>(
  deps: ActionDeps,
  config: SessionActionConfig<TSchema>,
  handler: (ctx: AuthenticatedContext, data: z.infer<TSchema>) => Promise<void>,
  payload?: unknown,
): Promise<Result>;

export function executeAction<TSchema extends z.ZodType>(
  deps: ActionDeps,
  config: PublicActionConfig<TSchema>,
  handler: (ctx: RequestContext, data: z.infer<TSchema>) => Promise<void>,
  payload?: unknown,
): Promise<Result>;

export async function executeAction<TSchema extends z.ZodType>(
  deps: ActionDeps,
  config: ActionConfig<TSchema>,
  handler: (ctx: AuthenticatedContext, data: z.infer<TSchema>) => Promise<void>,
  payload?: unknown,
): Promise<Result> {
  let ctx: RequestContext | undefined;

  try {
    ctx = await deps.getContext();
    guardAccess(ctx, config);

    const input = validateInput(ctx, config.input, payload);

    if (!input.success) {
      return fail(input.error);
    }

    // `guardAccess` guarantees a session for non-public configs; public
    // handlers are typed against the wider `RequestContext`.
    await handler(ctx as AuthenticatedContext, input.data);
    return ok(undefined);
  } catch (error) {
    return handleFailure(ctx, error);
  }
}
