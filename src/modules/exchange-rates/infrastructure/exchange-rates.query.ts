import { and, asc, eq, isNull, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { exchangeRate } from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list/list-params';
import type { Paginated } from '@/shared/list/paginated';
import type {
  ExchangeRateFormDTO,
  ExchangeRateListItemDTO,
} from '../application/exchange-rates.types';

function buildWhere(_params: ListParams): SQL | undefined {
  const conditions: SQL[] = [isNull(exchangeRate.deletedAt)];

  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

export async function listExchangeRates(
  ctx: RequestContext,
  params: ListParams,
): Promise<Paginated<ExchangeRateListItemDTO>> {
  const where = buildWhere(params);

  const [counted, rows] = await Promise.all([
    ctx.db.select({ total: sql<number>`count(*)::int` }).from(exchangeRate).where(where),
    ctx.db
      .select({
        id: exchangeRate.id,
        baseCode: exchangeRate.baseCode,
        quoteCode: exchangeRate.quoteCode,
        rate: exchangeRate.rate,
        fetchedAt: exchangeRate.fetchedAt,
        createdAt: exchangeRate.createdAt,
      })
      .from(exchangeRate)
      .where(where)
      .orderBy(asc(exchangeRate.baseCode), asc(exchangeRate.quoteCode))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  return {
    items: rows.map((r) => ({ ...r, rate: r.rate.toString() })),
    total: counted[0]?.total ?? 0,
  };
}

export async function getExchangeRate(
  ctx: RequestContext,
  id: string,
): Promise<ExchangeRateFormDTO | undefined> {
  const rows = await ctx.db
    .select({
      id: exchangeRate.id,
      baseCode: exchangeRate.baseCode,
      quoteCode: exchangeRate.quoteCode,
      rate: exchangeRate.rate,
      fetchedAt: exchangeRate.fetchedAt,
    })
    .from(exchangeRate)
    .where(and(eq(exchangeRate.id, id), isNull(exchangeRate.deletedAt)))
    .limit(1);

  if (!rows[0]) {
    return undefined;
  }

  const row = rows[0];
  return { ...row, rate: row.rate.toString() };
}

export async function getCurrentRates(
  ctx: RequestContext,
): Promise<Array<{ baseCode: string; quoteCode: string; rate: string; fetchedAt: Date }>> {
  const rows = await ctx.db
    .select({
      baseCode: exchangeRate.baseCode,
      quoteCode: exchangeRate.quoteCode,
      rate: exchangeRate.rate,
      fetchedAt: exchangeRate.fetchedAt,
    })
    .from(exchangeRate)
    .where(isNull(exchangeRate.deletedAt));

  return rows.map((r) => ({ ...r, rate: r.rate.toString() }));
}
