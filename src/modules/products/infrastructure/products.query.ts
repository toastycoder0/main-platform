import { and, asc, eq, ilike, isNull, ne, or, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { searchILike } from '@/infrastructure/db/list-query';
import {
  brand,
  currency,
  documentType,
  priceList,
  product,
  productUnit,
} from '@/infrastructure/db/schema';
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

export interface Option {
  value: string;
  label: string;
}

export async function listBrandOptions(ctx: RequestContext): Promise<Option[]> {
  const rows = await ctx.db
    .select({ id: brand.id, name: brand.name })
    .from(brand)
    .where(isNull(brand.deletedAt))
    .orderBy(asc(brand.name), asc(brand.id));

  return rows.map((r) => ({ value: r.id, label: r.name }));
}

export async function listProductUnitOptions(ctx: RequestContext): Promise<Option[]> {
  const rows = await ctx.db
    .select({ id: productUnit.id, name: productUnit.name })
    .from(productUnit)
    .where(isNull(productUnit.deletedAt))
    .orderBy(asc(productUnit.sortOrder), asc(productUnit.id));

  return rows.map((r) => ({ value: r.id, label: r.name }));
}

export async function listCurrencyOptions(ctx: RequestContext): Promise<Option[]> {
  const rows = await ctx.db
    .select({ code: currency.code, name: currency.name })
    .from(currency)
    .where(isNull(currency.deletedAt))
    .orderBy(asc(currency.sortOrder), asc(currency.code));

  return rows.map((r) => ({ value: r.code, label: r.name }));
}

export async function listDocumentTypeOptions(ctx: RequestContext): Promise<Option[]> {
  const rows = await ctx.db
    .select({ id: documentType.id, name: documentType.name })
    .from(documentType)
    .where(isNull(documentType.deletedAt))
    .orderBy(asc(documentType.sortOrder), asc(documentType.id));

  return rows.map((r) => ({ value: r.id, label: r.name }));
}

export async function listPriceListOptions(ctx: RequestContext): Promise<Option[]> {
  const rows = await ctx.db
    .select({ id: priceList.id, name: priceList.name })
    .from(priceList)
    .where(isNull(priceList.deletedAt))
    .orderBy(asc(priceList.sortOrder), asc(priceList.id));

  return rows.map((r) => ({ value: r.id, label: r.name }));
}

export async function listProductOptions(
  ctx: RequestContext,
  opts?: { excludeId?: string; search?: string },
): Promise<Option[]> {
  const conditions: SQL[] = [isNull(product.deletedAt), eq(product.status, 'active')];

  if (opts?.excludeId) {
    conditions.push(ne(product.id, opts.excludeId));
  }

  if (opts?.search) {
    const searchTerm = `%${opts.search}%`;
    conditions.push(
      or(
        ilike(product.title, searchTerm),
        ilike(product.slug, searchTerm),
        ilike(product.code, searchTerm),
      ) as SQL,
    );
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const rows = await ctx.db
    .select({ id: product.id, title: product.title })
    .from(product)
    .where(where)
    .orderBy(asc(product.sortOrder), asc(product.id))
    .limit(50);

  return rows.map((r) => ({ value: r.id, label: r.title }));
}
