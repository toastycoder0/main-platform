import { verifyPassword } from 'better-auth/crypto';
import { and, eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { account, user, verification } from '@/infrastructure/db/schema';
import { requestPasswordReset, resetPasswordWithToken } from './auth.action';

const scope = `pwreset${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const state = vi.hoisted(() => ({
  ctx: undefined as RequestContext | undefined,
}));

vi.mock('@/infrastructure/context/next-factory', () => ({
  createRequestContext: () => {
    if (!state.ctx) {
      throw new Error('Test context not set');
    }
    return state.ctx;
  },
}));

const createdUserIds: string[] = [];
let targetUserId = '';

function testContext(): RequestContext {
  const logger: RequestContext['logger'] = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => logger,
  };

  return { db, session: null, permissions: new Set<string>(), logger, requestId: 'itest' };
}

beforeAll(async () => {
  const inserted = await db
    .insert(user)
    .values({
      firstName: 'Password',
      lastName: 'Reset',
      email: `${scope}@reset.test`,
    })
    .returning({ id: user.id });
  const row = inserted.at(0);

  if (!row) {
    throw new Error('Failed to create test user');
  }

  targetUserId = row.id;
  createdUserIds.push(targetUserId);
});

beforeEach(() => {
  state.ctx = testContext();
});

afterAll(async () => {
  await db.delete(verification).where(eq(verification.value, targetUserId));
  await db.delete(user).where(like(user.email, `${scope}%`));
});

async function takeResetToken(): Promise<string> {
  const rows = await db
    .select({ identifier: verification.identifier })
    .from(verification)
    .where(
      and(eq(verification.value, targetUserId), like(verification.identifier, 'reset-password:%')),
    )
    .orderBy(verification.createdAt);

  const last = rows.at(-1);

  if (!last) {
    throw new Error('No reset verification was created');
  }

  return last.identifier.replace('reset-password:', '');
}

describe('requestPasswordReset', () => {
  it('creates a verification token for a registered email', async () => {
    const result = await requestPasswordReset({ email: `${scope}@reset.test` });

    expect(result).toEqual({ success: true, data: undefined });

    const token = await takeResetToken();
    expect(token.length).toBeGreaterThan(0);

    const [row] = await db
      .select({ value: verification.value })
      .from(verification)
      .where(eq(verification.identifier, `reset-password:${token}`))
      .limit(1);

    expect(row?.value).toBe(targetUserId);
  });

  it('responds the same way for an unknown email', async () => {
    const result = await requestPasswordReset({ email: `${scope}.missing@reset.test` });

    expect(result).toEqual({ success: true, data: undefined });
  });
});

describe('resetPasswordWithToken', () => {
  it('sets the password for the token owner', async () => {
    await requestPasswordReset({ email: `${scope}@reset.test` });
    const token = await takeResetToken();

    await expect(resetPasswordWithToken({ token, newPassword: 'brand-new-1' })).rejects.toThrow();

    const [accountRow] = await db
      .select({ password: account.password })
      .from(account)
      .where(eq(account.userId, targetUserId))
      .limit(1);

    expect(accountRow?.password).toBeTruthy();
    expect(
      await verifyPassword({ hash: accountRow?.password ?? '', password: 'brand-new-1' }),
    ).toBe(true);
  });

  it('rejects a token that was already consumed', async () => {
    await requestPasswordReset({ email: `${scope}@reset.test` });
    const token = await takeResetToken();

    await expect(resetPasswordWithToken({ token, newPassword: 'brand-new-2' })).rejects.toThrow();

    const result = await resetPasswordWithToken({
      token,
      newPassword: 'brand-new-3',
    });

    expect(result).toEqual({
      success: false,
      error: 'El enlace no es válido o expiró. Solicita uno nuevo.',
    });
  });

  it('rejects an unknown token', async () => {
    const result = await resetPasswordWithToken({
      token: 'token-that-does-not-exist',
      newPassword: 'brand-new-4',
    });

    expect(result).toEqual({
      success: false,
      error: 'El enlace no es válido o expiró. Solicita uno nuevo.',
    });
  });
});
