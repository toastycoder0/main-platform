import { and, asc, eq, isNull, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { searchILike } from '@/infrastructure/db/list-query';
import { priceList } from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list/list-params';
import type { Paginated } from '@/shared/list/paginated';
import type { PriceListFormDTO, PriceListItemDTO } from '../application/price-lists.types';

function buildWhere(params: ListParams): SQL | undefined {
  const conditions: SQL[] = [isNull(priceList.deletedAt)];

  if (params.q) {
    const search = searchILike([priceList.name, priceList.slug], params.q);
    if (search) {
      conditions.push(search);
    }
  }

  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

export async function listPriceLists(
  ctx: RequestContext,
  params: ListParams,
): Promise<Paginated<PriceListItemDTO>> {
  const where = buildWhere(params);

  const [counted, rows] = await Promise.all([
    ctx.db.select({ total: sql<number>`count(*)::int` }).from(priceList).where(where),
    ctx.db
      .select({
        id: priceList.id,
        slug: priceList.slug,
        name: priceList.name,
        description: priceList.description,
        isDefault: priceList.isDefault,
        createdAt: priceList.createdAt,
      })
      .from(priceList)
      .where(where)
      .orderBy(asc(priceList.sortOrder), asc(priceList.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  return {
    items: rows,
    total: counted[0]?.total ?? 0,
  };
}

export async function getPriceList(
  ctx: RequestContext,
  id: string,
): Promise<PriceListFormDTO | undefined> {
  const rows = await ctx.db
    .select({
      id: priceList.id,
      name: priceList.name,
      description: priceList.description,
      isDefault: priceList.isDefault,
    })
    .from(priceList)
    .where(and(eq(priceList.id, id), isNull(priceList.deletedAt)))
    .limit(1);

  return rows[0];
}
