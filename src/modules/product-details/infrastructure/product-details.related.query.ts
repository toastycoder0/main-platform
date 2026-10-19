import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { brand, product, productLink, productUnit } from '@/infrastructure/db/schema';
import { type CardPrice, resolveCardPrice } from '../application/product-details.card-price';
import { LISTED_STATUSES } from '../application/product-details.status';
import type { RelatedProductDTO } from '../application/product-details.types';
import { queryBrandLogoUrls, queryCoverImageUrls } from './product-details.files';
import { queryFormulaProductIds, resolveBaseAmounts } from './product-details.prices';

const RELATED_LIMIT = 12;

interface RelatedRow {
  slug: string;
  title: string;
  currency: string;
  brandName: string | null;
  unit: string | null;
}

function toRelatedProduct(
  row: RelatedRow,
  extras: { imageUrl: string | null; logoUrl: string | null; price: CardPrice | null },
): RelatedProductDTO {
  return {
    slug: row.slug,
    title: row.title,
    imageUrl: extras.imageUrl,
    brand: row.brandName ? { name: row.brandName, logoUrl: extras.logoUrl } : null,
    price: extras.price ? { ...extras.price, currency: row.currency } : null,
    unit: row.unit,
  };
}

export async function getRelatedProducts(
  ctx: RequestContext,
  productId: string,
): Promise<RelatedProductDTO[]> {
  const rows = await ctx.db
    .select({
      id: product.id,
      slug: product.slug,
      title: product.title,
      currency: product.baseCurrency,
      brandId: brand.id,
      brandName: brand.name,
      unit: productUnit.abbreviation,
    })
    .from(productLink)
    .innerJoin(product, eq(productLink.linkedProductId, product.id))
    .leftJoin(brand, and(eq(product.brandId, brand.id), isNull(brand.deletedAt)))
    .leftJoin(productUnit, eq(product.unitId, productUnit.id))
    .where(
      and(
        eq(productLink.type, 'related'),
        eq(productLink.productId, productId),
        isNull(product.deletedAt),
        inArray(product.status, [...LISTED_STATUSES]),
      ),
    )
    .orderBy(asc(productLink.sortOrder), asc(productLink.id))
    .limit(RELATED_LIMIT);

  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const brandIds = [...new Set(rows.flatMap((row) => (row.brandId ? [row.brandId] : [])))];

  const [covers, logos, amounts, formulaIds] = await Promise.all([
    queryCoverImageUrls(ctx, ids),
    queryBrandLogoUrls(ctx, brandIds),
    resolveBaseAmounts(ctx, ids),
    queryFormulaProductIds(ctx, ids),
  ]);

  return rows.map((row) =>
    toRelatedProduct(row, {
      imageUrl: covers.get(row.id) ?? null,
      logoUrl: row.brandId ? (logos.get(row.brandId) ?? null) : null,
      price: ctx.session
        ? resolveCardPrice(amounts.get(row.id) ?? null, formulaIds.has(row.id))
        : null,
    }),
  );
}
