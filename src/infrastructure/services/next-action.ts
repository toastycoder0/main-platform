import type { z } from 'zod';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import type { RequestContext } from '@/infrastructure/context/types';
import type { Result } from '@/shared/result';
import { type ActionConfig, executeAction } from './action';

/**
 * Next binding for `executeAction`: the only place where the Next request
 * context factory is bound to the action protocol. Everything else lives
 * in the pure `action` module.
 */
export function run<TSchema extends z.ZodType>(
  config: ActionConfig<TSchema>,
  handler: (ctx: RequestContext, data: z.infer<TSchema>) => Promise<void>,
): (data?: unknown) => Promise<Result> {
  return (payload?: unknown) =>
    executeAction({ getContext: createRequestContext }, config, handler, payload);
}
