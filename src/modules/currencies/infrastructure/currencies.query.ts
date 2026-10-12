import { and, asc, eq, isNull, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { searchILike } from '@/infrastructure/db/list-query';
import { currency } from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list/list-params';
import type { Paginated } from '@/shared/list/paginated';
import type { CurrencyFormDTO, CurrencyListItemDTO } from '../application/currencies.types';

function buildWhere(params: ListParams): SQL | undefined {
  const conditions: SQL[] = [isNull(currency.deletedAt)];

  if (params.q) {
    const search = searchILike([currency.name, currency.code], params.q);
    if (search) {
      conditions.push(search);
    }
  }

  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

export async function listCurrencies(
  ctx: RequestContext,
  params: ListParams,
): Promise<Paginated<CurrencyListItemDTO>> {
  const where = buildWhere(params);

  const [counted, rows] = await Promise.all([
    ctx.db.select({ total: sql<number>`count(*)::int` }).from(currency).where(where),
    ctx.db
      .select({
        code: currency.code,
        name: currency.name,
        decimalDigits: currency.decimalDigits,
        isActive: currency.isActive,
        createdAt: currency.createdAt,
      })
      .from(currency)
      .where(where)
      .orderBy(asc(currency.sortOrder), asc(currency.code))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  return {
    items: rows,
    total: counted[0]?.total ?? 0,
  };
}

export async function getCurrency(
  ctx: RequestContext,
  code: string,
): Promise<CurrencyFormDTO | undefined> {
  const rows = await ctx.db
    .select({
      code: currency.code,
      name: currency.name,
      decimalDigits: currency.decimalDigits,
      isActive: currency.isActive,
    })
    .from(currency)
    .where(and(eq(currency.code, code), isNull(currency.deletedAt)))
    .limit(1);

  return rows[0];
}
