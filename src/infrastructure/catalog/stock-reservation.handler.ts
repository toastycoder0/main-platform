import type { NextRequest } from 'next/server';
import { createRequestContext } from '@/infrastructure/context/next-factory';
import { isCronAuthorized } from '@/infrastructure/services/cron-auth';
import { AppError, isAppError } from '@/shared/errors';
import { purgeExpiredReservations } from './stock-reservation.cleanup';

export async function GET(request: NextRequest): Promise<Response> {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const ctx = await createRequestContext();

  try {
    return Response.json(await purgeExpiredReservations(ctx.db));
  } catch (error) {
    ctx.logger.error({ err: error }, 'Stock reservation cleanup failed');

    return Response.json(
      { error: isAppError(error) ? error.message : new AppError('internal').message },
      { status: isAppError(error) ? error.status : 500 },
    );
  }
}
