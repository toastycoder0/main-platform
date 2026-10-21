import { asc, eq, sql } from 'drizzle-orm';
import { queryExchanges } from '@/infrastructure/catalog/catalog.exchange';
import type { RequestContext } from '@/infrastructure/context/types';
import { cart, cartItem } from '@/infrastructure/db/schema';
import { buildCartItem } from '../application/cart.line';
import { calculateCartTotals } from '../application/cart.totals';
import type { CartDTO } from '../application/cart.types';
import { getCartSources } from './cart.sources.query';

const EMPTY_CART: CartDTO = {
  id: null,
  lines: [],
  subtotals: [],
  taxes: [],
  totals: [],
  exchanges: {},
  hasQuote: false,
  itemCount: 0,
  lineCount: 0,
};

export async function getCart(ctx: RequestContext): Promise<CartDTO> {
  const userId = ctx.session?.user.id;

  if (!userId) {
    return EMPTY_CART;
  }

  const [cartRow] = await ctx.db
    .select({ id: cart.id })
    .from(cart)
    .where(eq(cart.userId, userId))
    .limit(1);

  if (!cartRow) {
    return EMPTY_CART;
  }

  const items = await ctx.db
    .select()
    .from(cartItem)
    .where(eq(cartItem.cartId, cartRow.id))
    .orderBy(asc(cartItem.createdAt), asc(cartItem.id));

  if (items.length === 0) {
    return { ...EMPTY_CART, id: cartRow.id };
  }

  const sources = await getCartSources(ctx, [...new Set(items.map((item) => item.productId))]);
  const sourcesById = new Map(sources.map((source) => [source.id, source]));

  const lines = items.map((item) => {
    const source = sourcesById.get(item.productId) ?? null;
    const variant = source?.variants.find((candidate) => candidate.id === item.variantId) ?? null;

    return buildCartItem(source, variant, item);
  });

  const { subtotals, taxes, totals } = calculateCartTotals(lines);

  const exchanges = await queryExchanges(
    ctx,
    totals.map((total) => total.currency),
  );

  return {
    id: cartRow.id,
    lines,
    subtotals,
    taxes,
    totals,
    exchanges,
    hasQuote: lines.some((line) => line.issue === null && line.price.kind === 'quote'),
    itemCount: lines.reduce((total, line) => total + line.quantity, 0),
    lineCount: lines.length,
  };
}

export async function getCartCount(ctx: RequestContext): Promise<number> {
  const userId = ctx.session?.user.id;

  if (!userId) {
    return 0;
  }

  const [row] = await ctx.db
    .select({ total: sql<number>`COALESCE(SUM(${cartItem.quantity}), 0)` })
    .from(cartItem)
    .innerJoin(cart, eq(cartItem.cartId, cart.id))
    .where(eq(cart.userId, userId));

  return Number(row?.total ?? 0);
}
