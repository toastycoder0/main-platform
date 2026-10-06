import { z } from 'zod';
import type { RequestContext } from '@/infrastructure/context/types';
import { AppError, isAppError } from '@/shared/errors';
import { fail, ok, type Result } from '@/shared/result';

export interface ActionConfig<TSchema extends z.ZodType> {
  access?: 'session' | 'public';
  permission?: string;
  input?: TSchema;
}

function isNextRedirect(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('digest' in error)) {
    return false;
  }
  return typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT;');
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

export async function executeAction<TSchema extends z.ZodType>(
  deps: { getContext: () => Promise<RequestContext> },
  config: ActionConfig<TSchema>,
  handler: (ctx: RequestContext, data: z.infer<TSchema>) => Promise<void>,
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

    await handler(ctx, input.data);
    return ok(undefined);
  } catch (error) {
    return handleFailure(ctx, error);
  }
}
