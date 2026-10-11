import { and, asc, eq, isNull, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { searchILike } from '@/infrastructure/db/list-query';
import { productUnit } from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list/list-params';
import type { Paginated } from '@/shared/list/paginated';
import type {
  ProductUnitFormDTO,
  ProductUnitListItemDTO,
} from '../application/product-units.types';

function buildWhere(params: ListParams): SQL | undefined {
  const conditions: SQL[] = [isNull(productUnit.deletedAt)];

  if (params.q) {
    const search = searchILike([productUnit.name, productUnit.slug], params.q);
    if (search) {
      conditions.push(search);
    }
  }

  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

export async function listProductUnits(
  ctx: RequestContext,
  params: ListParams,
): Promise<Paginated<ProductUnitListItemDTO>> {
  const where = buildWhere(params);

  const [counted, rows] = await Promise.all([
    ctx.db.select({ total: sql<number>`count(*)::int` }).from(productUnit).where(where),
    ctx.db
      .select({
        id: productUnit.id,
        slug: productUnit.slug,
        name: productUnit.name,
        abbreviation: productUnit.abbreviation,
        taxCode: productUnit.taxCode,
        isActive: productUnit.isActive,
        createdAt: productUnit.createdAt,
      })
      .from(productUnit)
      .where(where)
      .orderBy(asc(productUnit.sortOrder), asc(productUnit.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  return {
    items: rows,
    total: counted[0]?.total ?? 0,
  };
}

export async function getProductUnit(
  ctx: RequestContext,
  id: string,
): Promise<ProductUnitFormDTO | undefined> {
  const rows = await ctx.db
    .select({
      id: productUnit.id,
      name: productUnit.name,
      abbreviation: productUnit.abbreviation,
      taxCode: productUnit.taxCode,
      isActive: productUnit.isActive,
    })
    .from(productUnit)
    .where(and(eq(productUnit.id, id), isNull(productUnit.deletedAt)))
    .limit(1);

  return rows[0];
}
