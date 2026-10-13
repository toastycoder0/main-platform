import { and, asc, eq, isNull, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { searchILike } from '@/infrastructure/db/list-query';
import { brand, product, productUnit } from '@/infrastructure/db/schema';
import type { ListParams } from '@/shared/list/list-params';
import type { Paginated } from '@/shared/list/paginated';
import type { ProductListItemDTO } from '../application/products.types';

function buildWhere(params: ListParams): SQL | undefined {
  const conditions: SQL[] = [isNull(product.deletedAt)];

  if (params.q) {
    const search = searchILike([product.title, product.slug, product.code], params.q);
    if (search) {
      conditions.push(search);
    }
  }

  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

export async function listProducts(
  ctx: RequestContext,
  params: ListParams,
): Promise<Paginated<ProductListItemDTO>> {
  const where = buildWhere(params);

  const [counted, rows] = await Promise.all([
    ctx.db.select({ total: sql<number>`count(*)::int` }).from(product).where(where),
    ctx.db
      .select({
        id: product.id,
        slug: product.slug,
        title: product.title,
        code: product.code,
        status: product.status,
        brandName: brand.name,
        unitName: productUnit.name,
        createdAt: product.createdAt,
      })
      .from(product)
      .leftJoin(brand, eq(product.brandId, brand.id))
      .innerJoin(productUnit, eq(product.unitId, productUnit.id))
      .where(where)
      .orderBy(asc(product.sortOrder), asc(product.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
  ]);

  return {
    items: rows.map((r) => ({
      ...r,
      code: r.code ?? null,
      brandName: r.brandName ?? null,
    })),
    total: counted[0]?.total ?? 0,
  };
}
