import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cleanupOrphans: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/config/env', () => ({ env: { CRON_SECRET: 'test-secret' } }));

vi.mock('@/infrastructure/storage/client', () => ({ storageClient: {} }));

vi.mock('@/infrastructure/context/next-factory', () => ({
  createRequestContext: () =>
    Promise.resolve({
      db: {},
      session: null,
      permissions: new Set<string>(),
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: mocks.error,
        debug: vi.fn(),
        child: vi.fn(),
      },
      requestId: 'test',
    }),
}));

vi.mock('./files.cleanup.service', () => ({ cleanupOrphans: mocks.cleanupOrphans }));

import { GET } from './files.handler';

function makeRequest(options: { authorization?: string; query?: string } = {}): NextRequest {
  const headers = new Headers();

  if (options.authorization !== undefined) {
    headers.set('authorization', options.authorization);
  }

  return new NextRequest(`http://localhost/api/cron/files${options.query ?? ''}`, { headers });
}

beforeEach(() => {
  mocks.cleanupOrphans.mockReset();
  mocks.error.mockReset();
});

describe('GET /api/cron/files', () => {
  it('rejects a missing bearer token', async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(mocks.cleanupOrphans).not.toHaveBeenCalled();
  });

  it('rejects an incorrect token', async () => {
    const response = await GET(makeRequest({ authorization: 'Bearer nope' }));

    expect(response.status).toBe(401);
    expect(mocks.cleanupOrphans).not.toHaveBeenCalled();
  });

  it('rejects a token with a different length', async () => {
    const response = await GET(makeRequest({ authorization: 'Bearer test-secret-longer' }));

    expect(response.status).toBe(401);
  });

  it('rejects an invalid maxAgeHours', async () => {
    const response = await GET(
      makeRequest({ authorization: 'Bearer test-secret', query: '?maxAgeHours=abc' }),
    );

    expect(response.status).toBe(400);
    expect(mocks.cleanupOrphans).not.toHaveBeenCalled();
  });

  it('runs the cleanup and returns its result', async () => {
    mocks.cleanupOrphans.mockResolvedValue({ scanned: 2, deleted: 1 });

    const response = await GET(makeRequest({ authorization: 'Bearer test-secret' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ scanned: 2, deleted: 1 });
    expect(mocks.cleanupOrphans).toHaveBeenCalledOnce();
  });

  it('masks service failures and logs them', async () => {
    mocks.cleanupOrphans.mockRejectedValue(new Error('db down at 10.0.0.5'));

    const response = await GET(makeRequest({ authorization: 'Bearer test-secret' }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Error interno del servidor' });
    expect(mocks.error).toHaveBeenCalledOnce();
  });
});
