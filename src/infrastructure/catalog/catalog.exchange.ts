import { and, desc, inArray, isNull, or } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { exchangeRate } from '@/infrastructure/db/schema';
import { type ExchangeQuote, pickExchange } from '@/shared/pricing/exchange';

/** Latest quote per requested currency, resolving every currency in a single query. */
export async function queryExchanges(
  ctx: RequestContext,
  currencies: string[],
): Promise<Record<string, ExchangeQuote>> {
  const codes = [...new Set(currencies)];
  const quotes: Record<string, ExchangeQuote> = {};

  if (codes.length === 0) {
    return quotes;
  }

  const rows = await ctx.db
    .select({
      baseCode: exchangeRate.baseCode,
      quoteCode: exchangeRate.quoteCode,
      rate: exchangeRate.rate,
      fetchedAt: exchangeRate.fetchedAt,
    })
    .from(exchangeRate)
    .where(
      and(
        isNull(exchangeRate.deletedAt),
        or(inArray(exchangeRate.baseCode, codes), inArray(exchangeRate.quoteCode, codes)),
      ),
    )
    .orderBy(desc(exchangeRate.fetchedAt));

  const parsed = rows.map((row) => ({ ...row, rate: Number(row.rate) }));

  for (const code of codes) {
    const quote = pickExchange(parsed, code);

    if (quote) {
      quotes[code] = quote;
    }
  }

  return quotes;
}

export async function queryExchange(
  ctx: RequestContext,
  currency: string,
): Promise<ExchangeQuote | null> {
  const quotes = await queryExchanges(ctx, [currency]);
  return quotes[currency] ?? null;
}
