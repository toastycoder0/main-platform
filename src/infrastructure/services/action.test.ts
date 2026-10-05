import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { RequestContext } from '@/infrastructure/context/types';
import type { DatabaseClient } from '@/infrastructure/db';
import type { ILogger } from '@/infrastructure/logger/types';
import { AppError } from '@/shared/errors';
import { executeAction } from './action';

interface FixtureOptions {
  session?: boolean;
  permissions?: string[];
}

/**
 * Pure fixtures: the context factory is replaced by an already-resolved
 * RequestContext, so these tests never touch the database, Next.js or
 * better-auth — no module mocking anywhere in this suite.
 */
function createFixture({ session = false, permissions = [] }: FixtureOptions = {}) {
  const warn = vi.fn();
  const logError = vi.fn();
  const logger: ILogger = {
    info: vi.fn(),
    warn,
    error: logError,
    debug: vi.fn(),
    child: () => logger,
  };

  const ctx: RequestContext = {
    db: {} as DatabaseClient,
    session: session
      ? {
          user: {
            id: 'user_test',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            name: 'Test User',
            role: 'super_admin',
          },
          session: { id: 'session_test', expiresAt: new Date('2030-01-01T00:00:00Z') },
        }
      : null,
    permissions: new Set(permissions),
    logger,
    requestId: 'request_test',
  };

  const deps = { getContext: () => Promise.resolve(ctx) };

  return { deps, warn, logError };
}

/** Handler spy that resolves without doing anything (never an empty block). */
function createHandler() {
  return vi.fn(() => Promise.resolve());
}

describe('executeAction', () => {
  describe('access guard', () => {
    it('rejects without a session when access is session-scoped (default)', async () => {
      const { deps } = createFixture({ session: false });
      const handler = createHandler();

      const result = await executeAction(deps, {}, handler);

      expect(result).toEqual({ success: false, error: new AppError('unauthorized').message });
      expect(handler).not.toHaveBeenCalled();
    });

    it('runs the handler without a session when access is public', async () => {
      const { deps } = createFixture({ session: false });
      const handler = createHandler();

      const result = await executeAction(deps, { access: 'public' }, handler);

      expect(result).toEqual({ success: true, data: undefined });
      expect(handler).toHaveBeenCalledOnce();
    });

    it('rejects when the required permission is missing', async () => {
      const { deps } = createFixture({ session: true, permissions: ['users:read'] });
      const handler = createHandler();

      const result = await executeAction(deps, { permission: 'users:write' }, handler);

      expect(result).toEqual({ success: false, error: new AppError('forbidden').message });
      expect(handler).not.toHaveBeenCalled();
    });

    it('runs the handler when the required permission is granted', async () => {
      const { deps } = createFixture({ session: true, permissions: ['users:write'] });
      const handler = createHandler();

      const result = await executeAction(deps, { permission: 'users:write' }, handler);

      expect(result).toEqual({ success: true, data: undefined });
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('input schema', () => {
    it('fails before the handler when the payload does not match the schema', async () => {
      const { deps, warn } = createFixture({ session: true });
      const handler = createHandler();
      const input = z.object({ count: z.number().int() });

      const result = await executeAction(deps, { input }, handler, { count: 'not-a-number' });

      expect(result).toEqual({ success: false, error: 'Datos inválidos' });
      expect(warn).toHaveBeenCalledOnce();
      expect(handler).not.toHaveBeenCalled();
    });

    it('rejects a payload when no input schema is configured', async () => {
      const { deps, warn } = createFixture({ session: true });
      const handler = createHandler();

      const result = await executeAction(deps, {}, handler, { stray: true });

      expect(result).toEqual({ success: false, error: 'Datos inválidos' });
      expect(warn).toHaveBeenCalledOnce();
      expect(handler).not.toHaveBeenCalled();
    });

    it('passes parsed and transformed data to the handler', async () => {
      const { deps } = createFixture({ session: true });
      const input = z.object({ count: z.string().transform((value) => Number(value)) });
      let received: z.infer<typeof input> | undefined;

      const result = await executeAction(
        deps,
        { input },
        (_ctx, data) => {
          received = data;
          return Promise.resolve();
        },
        { count: '42' },
      );

      expect(result.success).toBe(true);
      expect(received).toEqual({ count: 42 });
    });
  });

  describe('handler outcome mapping', () => {
    it('resolves to ok when the handler succeeds', async () => {
      const { deps } = createFixture({ session: true });
      const handler = createHandler();

      const result = await executeAction(deps, {}, handler);

      expect(result).toEqual({ success: true, data: undefined });
      expect(handler).toHaveBeenCalledOnce();
    });

    it('maps AppError to its message without logging it as an error', async () => {
      const { deps, logError } = createFixture({ session: true });
      const appError = new AppError('not_found');
      const handler = vi.fn(() => {
        throw appError;
      });

      const result = await executeAction(deps, {}, handler);

      expect(result).toEqual({ success: false, error: appError.message });
      expect(logError).not.toHaveBeenCalled();
    });

    it('masks unknown errors behind a generic message and logs the original', async () => {
      const { deps, logError } = createFixture({ session: true });
      const handler = vi.fn(() => {
        throw new Error('DB connection failed at 10.0.0.5:5432');
      });

      const result = await executeAction(deps, {}, handler);

      expect(result).toEqual({ success: false, error: new AppError('internal').message });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).not.toContain('10.0.0.5');
      }
      expect(logError).toHaveBeenCalledOnce();
    });

    it('rethrows NEXT_REDIRECT untouched so the navigation is never masked', async () => {
      const { deps, logError } = createFixture({ session: true });
      const redirectError = Object.assign(new Error('Render Interrupted'), {
        digest: 'NEXT_REDIRECT;/auth/login;3',
      });
      const handler = vi.fn(() => {
        throw redirectError;
      });

      await expect(executeAction(deps, {}, handler)).rejects.toBe(redirectError);
      expect(logError).not.toHaveBeenCalled();
    });
  });

  describe('context acquisition', () => {
    it('masks context factory failures behind a generic message', async () => {
      const deps = {
        getContext: () => Promise.reject(new Error('connect ECONNREFUSED db:5432')),
      };
      const handler = createHandler();

      const result = await executeAction(deps, {}, handler);

      expect(result).toEqual({ success: false, error: new AppError('internal').message });
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
