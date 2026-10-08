import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { env } from '@/config/env';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { storageClient } from '@/infrastructure/storage/client';
import { AppError, isAppError } from '@/shared/errors';
import { cleanupQuerySchema } from '../application/files.validation';
import { cleanupOrphans } from './files.cleanup.service';

function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get('authorization');

  if (!header?.startsWith('Bearer ')) {
    return false;
  }

  const provided = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(env.CRON_SECRET);

  // Length check first: timingSafeEqual throws on buffers of different length.
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function GET(request: NextRequest): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const parsed = cleanupQuerySchema.safeParse({
    maxAgeHours: request.nextUrl.searchParams.get('maxAgeHours') ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const ctx = await createRequestContext();

  try {
    const maxAgeMs = parsed.data.maxAgeHours ? parsed.data.maxAgeHours * 60 * 60 * 1000 : undefined;

    return Response.json(await cleanupOrphans(ctx.db, storageClient, { maxAgeMs }));
  } catch (error) {
    ctx.logger.error({ err: error }, 'File cleanup failed');

    return Response.json(
      { error: isAppError(error) ? error.message : new AppError('internal').message },
      { status: isAppError(error) ? error.status : 500 },
    );
  }
}
