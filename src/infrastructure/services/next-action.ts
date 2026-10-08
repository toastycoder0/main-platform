import type { z } from 'zod';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import type { RequestContext } from '@/infrastructure/context/types';
import type { Result } from '@/shared/result';
import {
  type ActionConfig,
  type AuthenticatedContext,
  executeAction,
  type PublicActionConfig,
  type SessionActionConfig,
} from './action';

export function run<TSchema extends z.ZodType>(
  config: SessionActionConfig<TSchema>,
  handler: (ctx: AuthenticatedContext, data: z.infer<TSchema>) => Promise<void>,
): (data?: unknown) => Promise<Result>;

export function run<TSchema extends z.ZodType>(
  config: PublicActionConfig<TSchema>,
  handler: (ctx: RequestContext, data: z.infer<TSchema>) => Promise<void>,
): (data?: unknown) => Promise<Result>;

export function run<TSchema extends z.ZodType>(
  config: ActionConfig<TSchema>,
  handler: (ctx: AuthenticatedContext, data: z.infer<TSchema>) => Promise<void>,
): (data?: unknown) => Promise<Result> {
  return (payload?: unknown) =>
    executeAction(
      { getContext: createRequestContext },
      // Narrow the unified config to one overload; `executeAction` still reads
      // the real config at runtime.
      config as SessionActionConfig<TSchema>,
      handler,
      payload,
    );
}
