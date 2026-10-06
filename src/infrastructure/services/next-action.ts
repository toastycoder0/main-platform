import type { z } from 'zod';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import type { RequestContext } from '@/infrastructure/context/types';
import type { Result } from '@/shared/result';
import { type ActionConfig, executeAction } from './action';

export function run<TSchema extends z.ZodType>(
  config: ActionConfig<TSchema>,
  handler: (ctx: RequestContext, data: z.infer<TSchema>) => Promise<void>,
): (data?: unknown) => Promise<Result> {
  return (payload?: unknown) =>
    executeAction({ getContext: createRequestContext }, config, handler, payload);
}
