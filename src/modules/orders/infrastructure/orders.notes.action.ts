'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { order } from '@/infrastructure/db/schema';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import { addOrderNoteSchema } from '../application/orders.validation';
import { addOrderNote as insertOrderNote } from './orders.notes.repository';

export const addOrderNote = run(
  { permission: PERMISSIONS.orders.manage, input: addOrderNoteSchema },
  async (ctx, { orderId, body }) => {
    const [row] = await ctx.db
      .select({ id: order.id })
      .from(order)
      .where(eq(order.id, orderId))
      .limit(1);

    if (!row) {
      throw new AppError('not_found', 'El pedido no existe');
    }

    await insertOrderNote(ctx.db, { orderId, body, actorId: ctx.session.user.id });
    revalidatePath(`/dashboard/orders/${orderId}`);
  },
);
