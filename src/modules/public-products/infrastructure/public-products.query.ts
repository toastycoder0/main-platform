import { and, asc, desc, eq, inArray, isNull, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { searchILike } from '@/infrastructure/db/list-query';
import {
  brand,
  product,
  productCategory,
  productPrice,
  productTag,
  productUnit,
  tag,
  userProductPrice,
} from '@/infrastructure/db/schema';
import { PUBLIC_LISTING_STATUSES } from '@/modules/products/application/products.status';
import type {
  PublicProductDTO,
  PublicProductFilters,
  PublicProductsResult,
} from '../application/public-products.types';
import { queryBrandLogoUrls, queryFirstProductImageUrls } from './public-products.files';
import { resolvePriceListId, resolveProductPrices } from './public-products.prices';

const HOME_PRODUCT_LIMIT = 10;

interface ProductCardRow {
  id: string;
  slug: string;
  title: string;
  baseCurrency: string;
  brandId: string | null;
  brandName: string | null;
  unitAbbreviation: string | null;
}

async function toPublicProducts(
  ctx: RequestContext,
  rows: ProductCardRow[],
  priceListId: string | null,
): Promise<PublicProductDTO[]> {
  if (rows.length === 0) {
    return [];
  }

  const productIds = rows.map((row) => row.id);
  const brandIds = [
    ...new Set(rows.map((row) => row.brandId).filter((id): id is string => id !== null)),
  ];

  const [imageUrlByProduct, logoUrlByBrand, priceByProduct] = await Promise.all([
    queryFirstProductImageUrls(ctx, productIds),
    queryBrandLogoUrls(ctx, brandIds),
    resolveProductPrices(ctx, productIds, priceListId),
  ]);

  return rows.map((row) => {
    const price = priceByProduct.get(row.id);

    return {
      slug: row.slug,
      title: row.title,
      imageUrl: imageUrlByProduct.get(row.id) ?? null,
      brand: row.brandName
        ? {
            name: row.brandName,
            logoUrl: row.brandId ? (logoUrlByBrand.get(row.brandId) ?? null) : null,
          }
        : null,
      price: price
        ? { amount: price.amount, currency: row.baseCurrency, label: price.label }
        : null,
      unit: row.unitAbbreviation,
    };
  });
}

export async function getHomeProducts(
  ctx: RequestContext,
  order: 'recent' | 'popular',
): Promise<PublicProductDTO[]> {
  const orderClause =
    order === 'recent'
      ? [desc(product.createdAt), asc(product.id)]
      : [asc(product.sortOrder), asc(product.id)];

  const rows = await ctx.db
    .select({
      id: product.id,
      slug: product.slug,
      title: product.title,
      baseCurrency: product.baseCurrency,
      brandId: product.brandId,
      brandName: brand.name,
      unitAbbreviation: productUnit.abbreviation,
    })
    .from(product)
    .leftJoin(brand, eq(product.brandId, brand.id))
    .leftJoin(productUnit, eq(product.unitId, productUnit.id))
    .where(and(isNull(product.deletedAt), inArray(product.status, [...PUBLIC_LISTING_STATUSES])))
    .orderBy(...orderClause)
    .limit(HOME_PRODUCT_LIMIT);

  return toPublicProducts(ctx, rows, await resolvePriceListId(ctx));
}

function buildOrderBy(sort: PublicProductFilters['sort'], price: SQL): SQL[] {
  switch (sort) {
    case 'recent':
      return [desc(product.createdAt), asc(product.id)];
    case 'price-asc':
      return [sql`${price} asc nulls last`, asc(product.id)];
    case 'price-desc':
      return [sql`${price} desc nulls last`, asc(product.id)];
    default:
      return [asc(product.sortOrder), asc(product.id)];
  }
}

function buildCatalogConditions(ctx: RequestContext, filters: PublicProductFilters): SQL[] {
  const conditions: SQL[] = [];

  if (filters.categoryIds) {
    conditions.push(
      inArray(
        product.id,
        ctx.db
          .select({ id: productCategory.productId })
          .from(productCategory)
          .where(inArray(productCategory.categoryId, filters.categoryIds)),
      ),
    );
  }

  if (filters.brands.length > 0) {
    conditions.push(
      inArray(
        product.brandId,
        ctx.db
          .select({ id: brand.id })
          .from(brand)
          .where(
            and(
              inArray(brand.slug, filters.brands),
              isNull(brand.deletedAt),
              eq(brand.isActive, true),
            ),
          ),
      ),
    );
  }

  if (filters.tags.length > 0) {
    conditions.push(
      inArray(
        product.id,
        ctx.db
          .select({ id: productTag.productId })
          .from(productTag)
          .innerJoin(tag, eq(productTag.tagId, tag.id))
          .where(
            and(inArray(tag.slug, filters.tags), isNull(tag.deletedAt), eq(tag.isActive, true)),
          ),
      ),
    );
  }

  if (filters.units.length > 0) {
    conditions.push(
      inArray(
        product.unitId,
        ctx.db
          .select({ id: productUnit.id })
          .from(productUnit)
          .where(
            and(
              inArray(productUnit.slug, filters.units),
              isNull(productUnit.deletedAt),
              eq(productUnit.isActive, true),
            ),
          ),
      ),
    );
  }

  const search = filters.q
    ? searchILike([product.title, product.subtitle, product.code, brand.name], filters.q)
    : undefined;

  if (search) {
    conditions.push(search);
  }

  return conditions;
}

function buildPriceConditions(filters: PublicProductFilters, price: SQL): SQL[] {
  const conditions: SQL[] = [];

  if (filters.minPrice !== null) {
    conditions.push(sql`${price} >= ${filters.minPrice}`);
  }

  if (filters.maxPrice !== null) {
    conditions.push(sql`${price} <= ${filters.maxPrice}`);
  }

  return conditions;
}

/**
 * Public catalog listing. Prices only exist for authenticated users: without a
 * session the price filter and price sorts are ignored and cards carry no price.
 */
export async function queryPublicProducts(
  ctx: RequestContext,
  filters: PublicProductFilters,
): Promise<PublicProductsResult> {
  const userId = ctx.session?.user.id ?? null;
  const priceListId = await resolvePriceListId(ctx);

  // Mirrors resolveProductPrices: a user-specific amount wins, then the user's
  // own price list, then the price list that applies to them.
  const effectivePrice = sql<
    string | null
  >`coalesce(${userProductPrice.amount}, ${productPrice.amount})`;

  const where = and(
    isNull(product.deletedAt),
    inArray(product.status, [...PUBLIC_LISTING_STATUSES]),
    ...buildCatalogConditions(ctx, filters),
    ...(userId ? buildPriceConditions(filters, effectivePrice) : []),
  );

  const userPriceJoin = userId
    ? and(eq(userProductPrice.productId, product.id), eq(userProductPrice.userId, userId))
    : sql`false`;
  const listPriceJoin = and(
    eq(productPrice.productId, product.id),
    eq(
      productPrice.priceListId,
      sql`coalesce(${userProductPrice.priceListId}, ${priceListId}::text)`,
    ),
  );

  const isPriceSort = filters.sort === 'price-asc' || filters.sort === 'price-desc';
  const orderBy = buildOrderBy(isPriceSort && !userId ? 'popular' : filters.sort, effectivePrice);

  const [counted, rows] = await Promise.all([
    ctx.db
      .select({ total: sql<number>`count(*)::int` })
      .from(product)
      .leftJoin(brand, eq(product.brandId, brand.id))
      .leftJoin(userProductPrice, userPriceJoin)
      .leftJoin(productPrice, listPriceJoin)
      .where(where),
    ctx.db
      .select({
        id: product.id,
        slug: product.slug,
        title: product.title,
        baseCurrency: product.baseCurrency,
        brandId: product.brandId,
        brandName: brand.name,
        unitAbbreviation: productUnit.abbreviation,
      })
      .from(product)
      .leftJoin(brand, eq(product.brandId, brand.id))
      .leftJoin(productUnit, eq(product.unitId, productUnit.id))
      .leftJoin(userProductPrice, userPriceJoin)
      .leftJoin(productPrice, listPriceJoin)
      .where(where)
      .orderBy(...orderBy)
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
  ]);

  return {
    items: await toPublicProducts(ctx, rows, priceListId),
    total: counted[0]?.total ?? 0,
  };
}
