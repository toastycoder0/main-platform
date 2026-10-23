import { type AnyColumn, and, asc, desc, eq, gt, inArray, or, type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { RequestContext } from '@/infrastructure/context/types';
import { ilikePattern, searchILike } from '@/infrastructure/db/list-query';
import { order, orderItem, productImage, stockReservation, user } from '@/infrastructure/db/schema';
import { listFilesByOwners } from '@/infrastructure/files/service';
import { PERMISSIONS } from '@/shared/constants/permissions';
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
  OrderListItemPreviewDTO,
  OrderReservationDTO,
  OrderStatus,
} from '../application/orders.types';
import {
  orderLineFieldsSchema,
  orderLinePriceSchema,
  orderLineTaxSchema,
} from '../application/orders.validation';
import type { OrdersParams } from './orders.params';

const ownerUser = alias(user, 'order_owner');
const creatorUser = alias(user, 'order_creator');

function fullName(firstName: AnyColumn, lastName: AnyColumn): SQL<string | null> {
  return sql<string | null>`nullif(trim(concat(${firstName}, ' ', ${lastName})), '')`;
}

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

function buildWhere(
  ctx: RequestContext,
  params: OrdersParams,
  { includeStatus = true }: { includeStatus?: boolean } = {},
): SQL | undefined {
  const conditions: SQL[] = [];
  const scope = ownerScope(ctx);

  if (scope) {
    conditions.push(scope);
  }

  if (params.q) {
    const direct = searchILike([sql`${order.number}::text`, order.notes], params.q);
    const pattern = ilikePattern(params.q);
    const itemSearch = sql`exists (select 1 from ${orderItem} where ${orderItem.orderId} = ${order.id} and (${orderItem.productTitle} ilike ${pattern} or ${orderItem.variantTitle} ilike ${pattern}))`;
    const search = direct ? or(direct, itemSearch) : itemSearch;

    if (search) {
      conditions.push(search);
    }
  }

  if (includeStatus && params.status.length > 0) {
    conditions.push(inArray(order.status, params.status));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

interface OrderItemRow {
  orderId: string;
  productId: string | null;
  productTitle: string;
  variantTitle: string;
  quantity: number;
}

interface OrderItemSummary {
  counts: Map<string, number>;
  previews: Map<string, OrderListItemPreviewDTO[]>;
}

async function queryOrderItems(ctx: RequestContext, orderIds: string[]): Promise<OrderItemSummary> {
  const summary: OrderItemSummary = { counts: new Map(), previews: new Map() };

  if (orderIds.length === 0) {
    return summary;
  }

  const rows: OrderItemRow[] = await ctx.db
    .select({
      orderId: orderItem.orderId,
      productId: orderItem.productId,
      productTitle: orderItem.productTitle,
      variantTitle: orderItem.variantTitle,
      quantity: orderItem.quantity,
    })
    .from(orderItem)
    .where(inArray(orderItem.orderId, orderIds))
    .orderBy(asc(orderItem.orderId), asc(orderItem.sortOrder), asc(orderItem.id));

  const covers = await queryCoverImages(
    ctx,
    rows.flatMap((row) => (row.productId ? [row.productId] : [])),
  );

  for (const row of rows) {
    summary.counts.set(row.orderId, (summary.counts.get(row.orderId) ?? 0) + 1);

    const previews = summary.previews.get(row.orderId) ?? [];

    if (previews.length < 3) {
      previews.push({
        productTitle: row.productTitle,
        variantTitle: row.variantTitle,
        quantity: row.quantity,
        imageUrl: row.productId ? (covers.get(row.productId) ?? null) : null,
      });
      summary.previews.set(row.orderId, previews);
    }
  }

  return summary;
}

async function queryReservationExpiries(
  ctx: RequestContext,
  orderIds: string[],
): Promise<Map<string, Date>> {
  if (orderIds.length === 0) {
    return new Map();
  }

  const rows = await ctx.db
    .select({
      orderId: stockReservation.orderId,
      expiresAt: stockReservation.expiresAt,
    })
    .from(stockReservation)
    .where(
      and(inArray(stockReservation.orderId, orderIds), gt(stockReservation.expiresAt, sql`now()`)),
    );

  const expiries = new Map<string, Date>();

  for (const row of rows) {
    if (!row.orderId) {
      continue;
    }

    const current = expiries.get(row.orderId);

    if (!current || row.expiresAt > current) {
      expiries.set(row.orderId, row.expiresAt);
    }
  }

  return expiries;
}

export async function listOrders(
  ctx: RequestContext,
  params: OrdersParams,
): Promise<Paginated<OrderListItemDTO>> {
  const where = buildWhere(ctx, params);
  const orderBy =
    params.sort === 'oldest'
      ? [asc(order.createdAt), asc(order.id)]
      : [desc(order.createdAt), desc(order.id)];

  const [counted, rows] = await Promise.all([
    ctx.db.select({ total: sql<number>`count(*)::int` }).from(order).where(where),
    ctx.db
      .select({
        id: order.id,
        number: order.number,
        userId: order.userId,
        status: order.status,
        fulfillmentType: order.fulfillmentType,
        createdAt: order.createdAt,
        totals: order.totals,
        ownerName: fullName(ownerUser.firstName, ownerUser.lastName),
      })
      .from(order)
      .leftJoin(ownerUser, eq(ownerUser.id, order.userId))
      .where(where)
      .orderBy(...orderBy)
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  const ids = rows.map((row) => row.id);
  const [items, reservationExpiries] = await Promise.all([
    queryOrderItems(ctx, ids),
    queryReservationExpiries(ctx, ids),
  ]);

  const viewerId = ctx.session?.user.id;

  return {
    items: rows.map((row) => ({
      id: row.id,
      number: row.number,
      status: row.status,
      fulfillmentType: row.fulfillmentType,
      createdAt: row.createdAt,
      itemCount: items.counts.get(row.id) ?? 0,
      previewItems: items.previews.get(row.id) ?? [],
      reservationExpiresAt: reservationExpiries.get(row.id) ?? null,
      totals: parseCurrencyAmounts(row.totals),
      ownerName: row.ownerName,
      isOwner: row.userId === viewerId,
    })),
    total: counted[0]?.total ?? 0,
  };
}

/** Counts per status for the current search, ignoring the status filter itself. */
export async function countOrdersByStatus(
  ctx: RequestContext,
  params: OrdersParams,
): Promise<Record<OrderStatus, number>> {
  const where = buildWhere(ctx, params, { includeStatus: false });
  const rows = await ctx.db
    .select({ status: order.status, total: sql<number>`count(*)::int` })
    .from(order)
    .where(where)
    .groupBy(order.status);

  const counts: Record<OrderStatus, number> = {
    pending: 0,
    paid: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const row of rows) {
    counts[row.status] = row.total;
  }

  return counts;
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
    .select({
      id: order.id,
      number: order.number,
      userId: order.userId,
      status: order.status,
      fulfillmentType: order.fulfillmentType,
      createdAt: order.createdAt,
      billing: order.billing,
      fulfillment: order.fulfillment,
      subtotals: order.subtotals,
      taxes: order.taxes,
      totals: order.totals,
      notes: order.notes,
      createdByName: fullName(creatorUser.firstName, creatorUser.lastName),
    })
    .from(order)
    .leftJoin(creatorUser, eq(creatorUser.id, order.createdById))
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
    createdByName: row.createdByName,
    isOwner: row.userId === ctx.session?.user.id,
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
