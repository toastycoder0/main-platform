import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { env } from '@/config/env';

/** Vercel cron requests carry the configured secret as a bearer token. */
export function isCronAuthorized(request: NextRequest): boolean {
  const header = request.headers.get('authorization');

  if (!header?.startsWith('Bearer ')) {
    return false;
  }

  const provided = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(env.CRON_SECRET);

  // Length check first: timingSafeEqual throws on buffers of different length.
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
