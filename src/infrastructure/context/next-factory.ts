import { cache } from 'react';
import { db } from '@/infrastructure/db';
import { logger } from '@/infrastructure/logger';
import { auth } from '@/infrastructure/services/auth';
import { buildRequestContext } from './factory';

export const createRequestContext = cache(async () => {
  const { headers } = await import('next/headers');

  return buildRequestContext({
    db,
    auth,
    logger,
    headers: await headers(),
  });
});
