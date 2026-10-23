'use server';

import { and, asc, eq, or, type SQL } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { RequestContext } from '@/infrastructure/context/types';
import { order, orderItem } from '@/infrastructure/db/schema';
import type { AuthenticatedContext } from '@/infrastructure/services/action';
import { run } from '@/infrastructure/services/next-action';
import { buildCartLine, type ResolvedCartLine } from '@/modules/cart/application/cart.line';
import type { CartSource } from '@/modules/cart/application/cart.types';
import { addCartLines } from '@/modules/cart/infrastructure/cart.repository';
import { findCartSources } from '@/modules/cart/infrastructure/cart.sources.query';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import type { OpenFieldValues } from '@/shared/pricing/types';
import { orderLineFieldsSchema, reorderOrderSchema } from '../application/orders.validation';

type OrderItemRow = typeof orderItem.$inferSelect;

function revalidateCart(): void {
  revalidatePath('/cart');
  revalidatePath('/', 'layout');
}

function ownerConditions(ctx: AuthenticatedContext, orderId: string): SQL[] {
  const conditions: SQL[] = [eq(order.id, orderId)];

  if (ctx.permissions.has(PERMISSIONS.admin.access)) {
    return conditions;
  }

  const scope = or(
    eq(order.userId, ctx.session.user.id),
    eq(order.createdById, ctx.session.user.id),
  );

  if (scope) {
    conditions.push(scope);
  }

  return conditions;
}

async function requireOwnedOrder(ctx: AuthenticatedContext, orderId: string): Promise<void> {
  const [row] = await ctx.db
    .select({ id: order.id })
    .from(order)
    .where(and(...ownerConditions(ctx, orderId)))
    .limit(1);

  if (!row) {
    throw new AppError('not_found', 'El pedido no existe');
  }
}

async function loadOrderItems(ctx: RequestContext, orderId: string): Promise<OrderItemRow[]> {
  const items = await ctx.db
    .select()
    .from(orderItem)
    .where(eq(orderItem.orderId, orderId))
    .orderBy(asc(orderItem.sortOrder), asc(orderItem.id));

  if (items.length === 0) {
    throw new AppError('invalid_input', 'El pedido no tiene artículos');
  }

  return items;
}

function resolveReorderLine(source: CartSource | undefined, item: OrderItemRow): ResolvedCartLine {
  const parsedFields = orderLineFieldsSchema.safeParse(item.fields);
  const variant = source?.variants.find(
    (candidate) => candidate.id === item.variantId && candidate.isActive,
  );

  if (!source || !parsedFields.success || !variant) {
    throw new AppError('invalid_input', `"${item.productTitle}" ya no está disponible`);
  }

  const fields: OpenFieldValues = {};

  for (const field of variant.openFields) {
    const value = parsedFields.data.find((entry) => entry.label === field.label)?.value;

    if (value) {
      fields[field.key] = value;
    }
  }

  const result = buildCartLine(source, {
    productSlug: item.productSlug,
    variantId: variant.id,
    quantity: item.quantity,
    fields,
  });

  if (!result.ok) {
    throw new AppError('invalid_input', result.message);
  }

  return result.line;
}

export const reorderOrder = run({ input: reorderOrderSchema }, async (ctx, { orderId }) => {
  await requireOwnedOrder(ctx, orderId);

  const items = await loadOrderItems(ctx, orderId);
  const sources = await findCartSources(ctx, [...new Set(items.map((item) => item.productSlug))]);
  const resolved = items.map((item) => resolveReorderLine(sources.get(item.productSlug), item));

  await addCartLines(ctx, resolved);
  revalidateCart();
  redirect('/cart');
});
