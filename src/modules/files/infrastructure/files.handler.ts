import type { NextRequest } from 'next/server';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { cleanupQuerySchema } from '@/infrastructure/files/validation';
import { isCronAuthorized } from '@/infrastructure/services/cron-auth';
import { storageClient } from '@/infrastructure/storage/client';
import { AppError, isAppError } from '@/shared/errors';
import { cleanupOrphans } from './files.cleanup.service';

export async function GET(request: NextRequest): Promise<Response> {
  if (!isCronAuthorized(request)) {
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
