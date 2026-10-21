import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import {
  queryFormulaProductIds,
  resolveBaseAmounts,
} from '@/infrastructure/catalog/catalog.prices';
import type { RequestContext } from '@/infrastructure/context/types';
import { brand, product, productLink, productUnit } from '@/infrastructure/db/schema';
import { PUBLIC_LISTING_STATUSES } from '@/modules/products/application/products.status';
import { queryCardAvailability } from '@/modules/products/infrastructure/products.card.query';
import { type CardPrice, resolveCardPrice } from '../application/product-details.card-price';
import type { RelatedProductDTO } from '../application/product-details.types';
import { queryBrandLogoUrls, queryCoverImageUrls } from './product-details.files';

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
  extras: {
    imageUrl: string | null;
    logoUrl: string | null;
    price: CardPrice | null;
    variants: RelatedProductDTO['variants'];
    onDemand: boolean;
    leadTimeDays: number;
  },
): RelatedProductDTO {
  return {
    slug: row.slug,
    title: row.title,
    imageUrl: extras.imageUrl,
    brand: row.brandName ? { name: row.brandName, logoUrl: extras.logoUrl } : null,
    price: extras.price ? { ...extras.price, currency: row.currency } : null,
    unit: row.unit,
    variants: extras.variants,
    onDemand: extras.onDemand,
    leadTimeDays: extras.leadTimeDays,
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
        inArray(product.status, [...PUBLIC_LISTING_STATUSES]),
      ),
    )
    .orderBy(asc(productLink.sortOrder), asc(productLink.id))
    .limit(RELATED_LIMIT);

  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const brandIds = [...new Set(rows.flatMap((row) => (row.brandId ? [row.brandId] : [])))];

  const [covers, logos, amounts, formulaIds, availabilityByProduct] = await Promise.all([
    queryCoverImageUrls(ctx, ids),
    queryBrandLogoUrls(ctx, brandIds),
    resolveBaseAmounts(ctx, ids),
    queryFormulaProductIds(ctx, ids),
    queryCardAvailability(ctx, ids),
  ]);

  return rows.map((row) => {
    const availability = availabilityByProduct.get(row.id);

    return toRelatedProduct(row, {
      imageUrl: covers.get(row.id) ?? null,
      logoUrl: row.brandId ? (logos.get(row.brandId) ?? null) : null,
      price: ctx.session
        ? resolveCardPrice(amounts.get(row.id) ?? null, formulaIds.has(row.id))
        : null,
      variants: availability?.variants ?? [],
      onDemand: availability?.onDemand ?? false,
      leadTimeDays: availability?.leadTimeDays ?? 0,
    });
  });
}
