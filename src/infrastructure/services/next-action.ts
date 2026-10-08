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

export function run<TSchema extends z.ZodType, TResult>(
  config: SessionActionConfig<TSchema>,
  handler: (ctx: AuthenticatedContext, data: z.infer<TSchema>) => Promise<TResult>,
): (data?: unknown) => Promise<Result<TResult>>;

export function run<TSchema extends z.ZodType>(
  config: PublicActionConfig<TSchema>,
  handler: (ctx: RequestContext, data: z.infer<TSchema>) => Promise<void>,
): (data?: unknown) => Promise<Result>;

export function run<TSchema extends z.ZodType, TResult>(
  config: PublicActionConfig<TSchema>,
  handler: (ctx: RequestContext, data: z.infer<TSchema>) => Promise<TResult>,
): (data?: unknown) => Promise<Result<TResult>>;

export function run<TSchema extends z.ZodType, TResult>(
  config: ActionConfig<TSchema>,
  handler: (ctx: AuthenticatedContext, data: z.infer<TSchema>) => Promise<TResult>,
): (data?: unknown) => Promise<Result<TResult>> {
  return (payload?: unknown) =>
    executeAction(
      { getContext: createRequestContext },
      config as SessionActionConfig<TSchema>,
      handler,
      payload,
    );
}
