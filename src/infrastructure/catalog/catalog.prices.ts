import { and, eq, inArray } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import {
  priceList,
  productItem,
  productPrice,
  user,
  userProductPrice,
} from '@/infrastructure/db/schema';

async function resolveFallbackListId(ctx: RequestContext, userId: string): Promise<string | null> {
  const [userRow] = await ctx.db
    .select({ priceListId: user.priceListId })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (userRow?.priceListId) {
    return userRow.priceListId;
  }

  const [defaultRow] = await ctx.db
    .select({ id: priceList.id })
    .from(priceList)
    .where(eq(priceList.isDefault, true))
    .limit(1);

  return defaultRow?.id ?? null;
}

interface UserPriceEntry {
  productId: string;
  amount: string | null;
  priceListId: string | null;
}

function pickAmount(
  entry: UserPriceEntry | undefined,
  fallbackListId: string | null,
  listAmounts: Map<string, number>,
  productId: string,
): number | undefined {
  if (entry?.amount != null) {
    return Number(entry.amount);
  }

  const listId = entry?.priceListId ?? fallbackListId;
  return listId ? listAmounts.get(`${productId}:${listId}`) : undefined;
}

async function queryListAmounts(
  ctx: RequestContext,
  productIds: string[],
  listIds: string[],
): Promise<Map<string, number>> {
  if (listIds.length === 0) {
    return new Map();
  }

  const rows = await ctx.db
    .select({
      productId: productPrice.productId,
      priceListId: productPrice.priceListId,
      amount: productPrice.amount,
    })
    .from(productPrice)
    .where(
      and(inArray(productPrice.productId, productIds), inArray(productPrice.priceListId, listIds)),
    );

  return new Map(rows.map((row) => [`${row.productId}:${row.priceListId}`, Number(row.amount)]));
}

/**
 * Base amount per product for the current user: a user-specific amount wins,
 * then the user's own price list, then the list that applies to them. Prices
 * never exist without a session.
 */
export async function resolveBaseAmounts(
  ctx: RequestContext,
  productIds: string[],
): Promise<Map<string, number>> {
  const amounts = new Map<string, number>();
  const userId = ctx.session?.user.id;

  if (!userId || productIds.length === 0) {
    return amounts;
  }

  const [userPrices, fallbackListId] = await Promise.all([
    ctx.db
      .select({
        productId: userProductPrice.productId,
        amount: userProductPrice.amount,
        priceListId: userProductPrice.priceListId,
      })
      .from(userProductPrice)
      .where(
        and(eq(userProductPrice.userId, userId), inArray(userProductPrice.productId, productIds)),
      ),
    resolveFallbackListId(ctx, userId),
  ]);

  const listIds = new Set<string>();
  for (const id of [fallbackListId, ...userPrices.map((entry) => entry.priceListId)]) {
    if (id) {
      listIds.add(id);
    }
  }

  const listAmounts = await queryListAmounts(ctx, productIds, [...listIds]);
  const entries = new Map(userPrices.map((entry) => [entry.productId, entry]));

  for (const productId of productIds) {
    const amount = pickAmount(entries.get(productId), fallbackListId, listAmounts, productId);

    if (amount !== undefined) {
      amounts.set(productId, amount);
    }
  }

  return amounts;
}

export async function queryFormulaProductIds(
  ctx: RequestContext,
  productIds: string[],
): Promise<Set<string>> {
  if (productIds.length === 0) {
    return new Set();
  }

  const rows = await ctx.db
    .select({ productId: productItem.productId })
    .from(productItem)
    .where(
      and(
        inArray(productItem.productId, productIds),
        eq(productItem.pricingModel, 'formula'),
        eq(productItem.isActive, true),
      ),
    );

  return new Set(rows.map((row) => row.productId));
}
