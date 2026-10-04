import type { z } from 'zod';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import type { RequestContext } from '@/infrastructure/context/types';
import { AppError, isAppError } from '@/shared/errors';
import { fail, ok, type Result } from '@/shared/result';
import { requireAuthenticated, requirePermission } from './base';

interface ActionConfig<TSchema extends z.ZodType> {
  /** `'session'` by default (secure by default); `'public'` only for actions that don't require a session. */
  access?: 'session' | 'public';
  /** Permission slug required before running the handler. */
  permission?: string;
  /** Strict schema for the input; without it, the payload passes through as-is. */
  input?: TSchema;
}

/** Next's redirect() travels in `digest` as `NEXT_REDIRECT;...` — it must never be masked. */
function isNextRedirect(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('digest' in error)) {
    return false;
  }
  return typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT;');
}

/** Protocol steps 2 + 3: session (unless `public`) and permission. Throws AppError. */
function guardAccess<TSchema extends z.ZodType>(
  ctx: RequestContext,
  config: ActionConfig<TSchema>,
): void {
  if (config.access !== 'public') {
    requireAuthenticated(ctx);
  }
  if (config.permission) {
    requirePermission(ctx, config.permission);
  }
}

/** Step 4: parses the payload (never trust it) and returns the typed data. */
function validateInput<TSchema extends z.ZodType>(
  ctx: RequestContext,
  schema: TSchema | undefined,
  payload: unknown,
): Result<z.infer<TSchema>> {
  if (!schema) {
    return ok(payload as z.infer<TSchema>);
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    ctx.logger.warn({ issues: parsed.error.issues }, 'Server action input validation failed');
    return fail('Datos inválidos');
  }

  return ok(parsed.data);
}

/** Sole owner of error mapping: redirect → rethrown, AppError → its message, anything else → logged + generic. */
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
 * Orchestrates a Server Action protocol in a fixed order:
 * context → session → permission → schema → handler.
 * The handler never writes try/catch: this wrapper is the only owner of one.
 * Success → `ok`, error → `fail(msg)`; the client only submits and shows errors.
 */
export function run<TSchema extends z.ZodType>(
  config: ActionConfig<TSchema>,
  handler: (ctx: RequestContext, data: z.infer<TSchema>) => Promise<void>,
): (data?: unknown) => Promise<Result> {
  return async (payload?: unknown): Promise<Result> => {
    let ctx: RequestContext | undefined;

    try {
      ctx = await createRequestContext();
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
  };
}
