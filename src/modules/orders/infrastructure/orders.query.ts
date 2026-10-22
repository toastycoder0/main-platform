import { and, asc, desc, eq, gt, inArray, or, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { searchILike } from '@/infrastructure/db/list-query';
import { order, orderItem, productImage, stockReservation } from '@/infrastructure/db/schema';
import { listFilesByOwners } from '@/infrastructure/files/service';
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { ListParams } from '@/shared/list/list-params';
import type { Paginated } from '@/shared/list/paginated';
import {
  parseBillingSnapshot,
  parseCurrencyAmounts,
  parseFulfillmentSnapshot,
  parseTaxTotals,
} from '../application/orders.mapping';
import type {
  OrderDTO,
  OrderItemDTO,
  OrderListItemDTO,
  OrderReservationDTO,
} from '../application/orders.types';
import {
  orderLineFieldsSchema,
  orderLinePriceSchema,
  orderLineTaxSchema,
} from '../application/orders.validation';

/**
 * Owners see their own orders; admins see every order. Without a session the
 * scope denies everything instead of widening.
 */
function ownerScope(ctx: RequestContext): SQL | undefined {
  const userId = ctx.session?.user.id;

  if (!userId) {
    return sql`false`;
  }

  if (ctx.permissions.has(PERMISSIONS.admin.access)) {
    return undefined;
  }

  return or(eq(order.userId, userId), eq(order.createdById, userId));
}

function buildWhere(ctx: RequestContext, params: ListParams): SQL | undefined {
  const conditions: SQL[] = [];
  const scope = ownerScope(ctx);

  if (scope) {
    conditions.push(scope);
  }

  if (params.q) {
    const search = searchILike([sql`${order.number}::text`, order.notes], params.q);

    if (search) {
      conditions.push(search);
    }
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listOrders(
  ctx: RequestContext,
  params: ListParams,
): Promise<Paginated<OrderListItemDTO>> {
  const where = buildWhere(ctx, params);

  const [counted, rows] = await Promise.all([
    ctx.db.select({ total: sql<number>`count(*)::int` }).from(order).where(where),
    ctx.db
      .select({
        id: order.id,
        number: order.number,
        status: order.status,
        fulfillmentType: order.fulfillmentType,
        createdAt: order.createdAt,
        totals: order.totals,
      })
      .from(order)
      .where(where)
      .orderBy(desc(order.createdAt), desc(order.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  const ids = rows.map((row) => row.id);
  const counts =
    ids.length > 0
      ? await ctx.db
          .select({ orderId: orderItem.orderId, total: sql<number>`count(*)::int` })
          .from(orderItem)
          .where(inArray(orderItem.orderId, ids))
          .groupBy(orderItem.orderId)
      : [];
  const countsByOrder = new Map(counts.map((row) => [row.orderId, row.total]));

  return {
    items: rows.map((row) => ({
      id: row.id,
      number: row.number,
      status: row.status,
      fulfillmentType: row.fulfillmentType,
      createdAt: row.createdAt,
      itemCount: countsByOrder.get(row.id) ?? 0,
      totals: parseCurrencyAmounts(row.totals),
    })),
    total: counted[0]?.total ?? 0,
  };
}

async function queryCoverImages(
  ctx: RequestContext,
  productIds: string[],
): Promise<Map<string, string>> {
  const covers = new Map<string, string>();
  const uniqueIds = [...new Set(productIds)];

  if (uniqueIds.length === 0) {
    return covers;
  }

  const rows = await ctx.db
    .select({ id: productImage.id, productId: productImage.productId })
    .from(productImage)
    .where(and(inArray(productImage.productId, uniqueIds), eq(productImage.isVisible, true)))
    .orderBy(asc(productImage.sortOrder), asc(productImage.id));

  const files = await listFilesByOwners(
    ctx.db,
    { entity: 'product_images', scope: 'image' },
    rows.map((row) => row.id),
  );

  for (const row of rows) {
    if (covers.has(row.productId)) {
      continue;
    }

    const url = files.get(row.id)?.[0]?.url;

    if (url) {
      covers.set(row.productId, url);
    }
  }

  return covers;
}

function toOrderItem(
  row: typeof orderItem.$inferSelect,
  imageUrl: string | null,
): OrderItemDTO | null {
  const price = orderLinePriceSchema.safeParse(row.price);
  const fields = orderLineFieldsSchema.safeParse(row.fields);

  if (!price.success || !fields.success) {
    return null;
  }

  const tax = row.tax === null ? null : orderLineTaxSchema.safeParse(row.tax);

  return {
    id: row.id,
    productSlug: row.productSlug,
    productTitle: row.productTitle,
    variantTitle: row.variantTitle,
    imageUrl,
    unit: row.unit,
    currency: row.currency,
    quantity: row.quantity,
    fields: fields.data,
    price: price.data,
    tax: tax?.success ? tax.data : null,
  };
}

export async function getOrder(ctx: RequestContext, id: string): Promise<OrderDTO | null> {
  const scope = ownerScope(ctx);
  const conditions: SQL[] = [eq(order.id, id)];

  if (scope) {
    conditions.push(scope);
  }

  const [row] = await ctx.db
    .select()
    .from(order)
    .where(and(...conditions))
    .limit(1);

  if (!row) {
    return null;
  }

  const billing = parseBillingSnapshot(row.billing);
  const fulfillment = parseFulfillmentSnapshot(row.fulfillment);

  if (!billing || !fulfillment) {
    ctx.logger.warn({ orderId: id }, 'Discarding order with an invalid snapshot');
    return null;
  }

  const itemRows = await ctx.db
    .select()
    .from(orderItem)
    .where(eq(orderItem.orderId, id))
    .orderBy(asc(orderItem.sortOrder), asc(orderItem.id));

  const covers = await queryCoverImages(
    ctx,
    itemRows.flatMap((item) => (item.productId ? [item.productId] : [])),
  );

  const items = itemRows.flatMap((item) => {
    const parsed = toOrderItem(item, item.productId ? (covers.get(item.productId) ?? null) : null);
    return parsed ? [parsed] : [];
  });

  return {
    id: row.id,
    number: row.number,
    status: row.status,
    fulfillmentType: row.fulfillmentType,
    createdAt: row.createdAt,
    billing,
    fulfillment,
    subtotals: parseCurrencyAmounts(row.subtotals),
    taxes: parseTaxTotals(row.taxes),
    totals: parseCurrencyAmounts(row.totals),
    notes: row.notes,
    items,
  };
}

/** Active stock holds created for this order, empty once they expire. */
export async function listOrderReservations(
  ctx: RequestContext,
  orderId: string,
): Promise<OrderReservationDTO[]> {
  const rows = await ctx.db
    .select({ expiresAt: stockReservation.expiresAt, quantity: stockReservation.quantity })
    .from(stockReservation)
    .where(and(eq(stockReservation.orderId, orderId), gt(stockReservation.expiresAt, sql`now()`)));

  return rows.map((row) => ({ expiresAt: row.expiresAt, quantity: Number(row.quantity) }));
}
