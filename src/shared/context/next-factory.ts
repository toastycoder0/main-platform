import { cache } from 'react';
import { auth } from '@/modules/auth/infrastructure/auth.config';
import { db } from '@/shared/db';
import { logger } from '@/shared/logger';
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
