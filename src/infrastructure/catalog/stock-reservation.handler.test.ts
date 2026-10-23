import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  purgeExpiredReservations: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/config/env', () => ({ env: { CRON_SECRET: 'test-secret' } }));

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

vi.mock('./stock-reservation.cleanup', () => ({
  purgeExpiredReservations: mocks.purgeExpiredReservations,
}));

import { GET } from './stock-reservation.handler';

function makeRequest(authorization?: string): NextRequest {
  const headers = new Headers();

  if (authorization !== undefined) {
    headers.set('authorization', authorization);
  }

  return new NextRequest('http://localhost/api/cron/reservations', { headers });
}

beforeEach(() => {
  mocks.purgeExpiredReservations.mockReset();
  mocks.error.mockReset();
});

describe('GET /api/cron/reservations', () => {
  it('rejects a missing bearer token', async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(mocks.purgeExpiredReservations).not.toHaveBeenCalled();
  });

  it('rejects an incorrect token', async () => {
    const response = await GET(makeRequest('Bearer nope'));

    expect(response.status).toBe(401);
    expect(mocks.purgeExpiredReservations).not.toHaveBeenCalled();
  });

  it('rejects a token with a different length', async () => {
    const response = await GET(makeRequest('Bearer test-secret-longer'));

    expect(response.status).toBe(401);
  });

  it('purges expired reservations and returns the count', async () => {
    mocks.purgeExpiredReservations.mockResolvedValue({ deleted: 3 });

    const response = await GET(makeRequest('Bearer test-secret'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deleted: 3 });
    expect(mocks.purgeExpiredReservations).toHaveBeenCalledOnce();
  });

  it('masks service failures and logs them', async () => {
    mocks.purgeExpiredReservations.mockRejectedValue(new Error('db down at 10.0.0.5'));

    const response = await GET(makeRequest('Bearer test-secret'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Error interno del servidor' });
    expect(mocks.error).toHaveBeenCalledOnce();
  });
});
