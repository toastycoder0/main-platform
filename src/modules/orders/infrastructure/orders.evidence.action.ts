'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { order } from '@/infrastructure/db/schema';
import { run } from '@/infrastructure/services/next-action';
import { AppError } from '@/shared/errors';
import { canManageEvidence } from '../application/orders.evidence';
import { attachOrderEvidenceSchema } from '../application/orders.validation';
import { syncOrderEvidence } from './orders.evidence.repository';

export const attachOrderEvidence = run(
  { input: attachOrderEvidenceSchema },
  async (ctx, { orderId, scope, refs }) => {
    const [row] = await ctx.db
      .select({ status: order.status, userId: order.userId })
      .from(order)
      .where(eq(order.id, orderId))
      .limit(1);

    if (!row) {
      throw new AppError('not_found', 'El pedido no existe');
    }

    const allowed = canManageEvidence({
      scope,
      status: row.status,
      isOwner: row.userId === ctx.session.user.id,
      permissions: ctx.permissions,
    });

    if (!allowed) {
      throw new AppError('forbidden', 'No puedes adjuntar evidencia a este pedido');
    }

    await ctx.db.transaction((tx) =>
      syncOrderEvidence(tx, { orderId, scope, refs, actorId: ctx.session.user.id }),
    );

    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/dashboard/orders/${orderId}`);
  },
);
