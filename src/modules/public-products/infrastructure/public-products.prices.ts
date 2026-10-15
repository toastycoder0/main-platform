import { and, eq, inArray } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import {
  priceList,
  productItem,
  productPrice,
  user,
  userProductPrice,
} from '@/infrastructure/db/schema';

export interface ResolvedPrice {
  amount: number;
  label: 'fixed' | 'starts_at' | 'variable';
}

interface PriceInputs {
  userPriceByProduct: Map<string, { amount: string | null; priceListId: string | null }>;
  formulaProductIds: Set<string>;
  priceByProductAndList: Map<string, number>;
}

/** The price list that applies to the current user. Prices are never exposed without a session. */
export async function resolvePriceListId(ctx: RequestContext): Promise<string | null> {
  const userId = ctx.session?.user.id;

  if (!userId) {
    return null;
  }

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

async function queryPriceInputs(
  ctx: RequestContext,
  userId: string,
  productIds: string[],
  priceListId: string | null,
): Promise<PriceInputs> {
  const [userPrices, formulaRows] = await Promise.all([
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
    ctx.db
      .select({ productId: productItem.productId })
      .from(productItem)
      .where(
        and(inArray(productItem.productId, productIds), eq(productItem.pricingModel, 'formula')),
      ),
  ]);

  const userListIds = userPrices
    .map((entry) => entry.priceListId)
    .filter((id): id is string => id !== null);
  const listIds = [...new Set([...userListIds, ...(priceListId ? [priceListId] : [])])];

  const priceRows =
    listIds.length > 0
      ? await ctx.db
          .select({
            productId: productPrice.productId,
            priceListId: productPrice.priceListId,
            amount: productPrice.amount,
          })
          .from(productPrice)
          .where(
            and(
              inArray(productPrice.productId, productIds),
              inArray(productPrice.priceListId, listIds),
            ),
          )
      : [];

  return {
    userPriceByProduct: new Map(userPrices.map((entry) => [entry.productId, entry])),
    formulaProductIds: new Set(formulaRows.map((row) => row.productId)),
    priceByProductAndList: new Map(
      priceRows.map((row) => [`${row.productId}:${row.priceListId}`, Number(row.amount)]),
    ),
  };
}

function resolvePrice(
  productId: string,
  inputs: PriceInputs,
  priceListId: string | null,
): ResolvedPrice | undefined {
  const userEntry = inputs.userPriceByProduct.get(productId);
  let baseAmount: number | null = null;

  if (userEntry?.amount != null) {
    baseAmount = Number(userEntry.amount);
  } else if (userEntry?.priceListId) {
    baseAmount = inputs.priceByProductAndList.get(`${productId}:${userEntry.priceListId}`) ?? null;
  } else if (priceListId) {
    baseAmount = inputs.priceByProductAndList.get(`${productId}:${priceListId}`) ?? null;
  }

  const hasFormula = inputs.formulaProductIds.has(productId);

  if (baseAmount !== null && baseAmount > 0) {
    return { amount: baseAmount, label: hasFormula ? 'starts_at' : 'fixed' };
  }

  if (hasFormula) {
    return { amount: 0, label: 'variable' };
  }

  return undefined;
}

export async function resolveProductPrices(
  ctx: RequestContext,
  productIds: string[],
  priceListId: string | null,
): Promise<Map<string, ResolvedPrice>> {
  const result = new Map<string, ResolvedPrice>();
  const userId = ctx.session?.user.id;

  if (!userId || productIds.length === 0) {
    return result;
  }

  const inputs = await queryPriceInputs(ctx, userId, productIds, priceListId);

  for (const productId of productIds) {
    const resolved = resolvePrice(productId, inputs, priceListId);
    if (resolved) {
      result.set(productId, resolved);
    }
  }

  return result;
}
