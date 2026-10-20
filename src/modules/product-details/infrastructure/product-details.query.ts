import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import {
  brand,
  category,
  documentType,
  exchangeRate,
  product,
  productCategory,
  productDetail,
  productDocument,
  productImage,
  productItem,
  productUnit,
} from '@/infrastructure/db/schema';
import { isUnlisted, PUBLIC_DETAIL_STATUSES } from '@/modules/products/application/products.status';
import { buildCategoryCrumbs, orderByPath } from '../application/product-details.crumbs';
import { pickExchange } from '../application/product-details.exchange';
import type {
  ExchangeDTO,
  ProductCrumbDTO,
  ProductDetailData,
  ProductDocumentDTO,
  ProductImageDTO,
  ProductMetadataDTO,
  ProductTaxDTO,
  VariantDTO,
} from '../application/product-details.types';
import { queryBrandLogoUrls, queryDocumentUrls, queryImageUrls } from './product-details.files';
import { toVariant } from './product-details.mapper';
import { resolveBaseAmounts } from './product-details.prices';

const EXCHANGE_LOOKUP_LIMIT = 20;

const detailVisibility = (slug: string) =>
  and(
    eq(product.slug, slug),
    isNull(product.deletedAt),
    inArray(product.status, [...PUBLIC_DETAIL_STATUSES]),
  );

export async function getProductMetadata(
  ctx: RequestContext,
  slug: string,
): Promise<ProductMetadataDTO | null> {
  const [row] = await ctx.db
    .select({
      title: product.title,
      subtitle: product.subtitle,
      description: product.description,
      status: product.status,
    })
    .from(product)
    .where(detailVisibility(slug))
    .limit(1);

  return row
    ? {
        title: row.title,
        description: row.subtitle ?? row.description,
        isUnlisted: isUnlisted(row.status),
      }
    : null;
}

async function queryCategoryCrumbs(
  ctx: RequestContext,
  productId: string,
): Promise<ProductCrumbDTO[]> {
  const active = and(isNull(category.deletedAt), eq(category.isActive, true));

  // The deepest category gives the most informative trail.
  const [leaf] = await ctx.db
    .select({ path: category.path })
    .from(productCategory)
    .innerJoin(category, eq(productCategory.categoryId, category.id))
    .where(and(eq(productCategory.productId, productId), active))
    .orderBy(desc(sql`length(${category.path})`), asc(category.sortOrder), asc(category.id))
    .limit(1);

  if (!leaf) {
    return [];
  }

  const ancestors = await ctx.db
    .select({ id: category.id, slug: category.slug, name: category.name })
    .from(category)
    .where(and(inArray(category.id, leaf.path.split('/')), active));

  return buildCategoryCrumbs(orderByPath(leaf.path, ancestors));
}

async function queryExchange(ctx: RequestContext, currency: string): Promise<ExchangeDTO | null> {
  if (!ctx.session) {
    return null;
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
        or(eq(exchangeRate.baseCode, currency), eq(exchangeRate.quoteCode, currency)),
      ),
    )
    .orderBy(desc(exchangeRate.fetchedAt))
    .limit(EXCHANGE_LOOKUP_LIMIT);

  return pickExchange(
    rows.map((row) => ({ ...row, rate: Number(row.rate) })),
    currency,
  );
}

async function queryGallery(ctx: RequestContext, productId: string): Promise<ProductImageDTO[]> {
  const rows = await ctx.db
    .select({
      id: productImage.id,
      itemId: productImage.itemId,
      altText: productImage.altText,
      section: productImage.section,
    })
    .from(productImage)
    .where(and(eq(productImage.productId, productId), eq(productImage.isVisible, true)))
    .orderBy(asc(productImage.sortOrder), asc(productImage.id));

  const urls = await queryImageUrls(
    ctx,
    rows.map((row) => row.id),
  );

  return rows.flatMap((row) => {
    const url = urls.get(row.id);
    return url
      ? [{ id: row.id, url, altText: row.altText, variantId: row.itemId, section: row.section }]
      : [];
  });
}

async function queryDocuments(
  ctx: RequestContext,
  productId: string,
): Promise<ProductDocumentDTO[]> {
  const rows = await ctx.db
    .select({ id: productDocument.id, label: productDocument.label, typeName: documentType.name })
    .from(productDocument)
    .leftJoin(documentType, eq(productDocument.documentTypeId, documentType.id))
    .where(and(eq(productDocument.productId, productId), eq(productDocument.isVisible, true)))
    .orderBy(asc(productDocument.sortOrder), asc(productDocument.id));

  const urls = await queryDocumentUrls(
    ctx,
    rows.map((row) => row.id),
  );

  return rows.flatMap((row) => {
    const url = urls.get(row.id);
    return url ? [{ id: row.id, label: row.label, url, typeName: row.typeName }] : [];
  });
}

function toTax(name: string | null, rate: string | null): ProductTaxDTO | null {
  const parsed = rate === null ? 0 : Number(rate);
  return name && parsed > 0 ? { name, rate: parsed } : null;
}

export async function getProductDetail(
  ctx: RequestContext,
  slug: string,
): Promise<ProductDetailData | null> {
  const [row] = await ctx.db
    .select({
      id: product.id,
      slug: product.slug,
      title: product.title,
      subtitle: product.subtitle,
      description: product.description,
      status: product.status,
      currency: product.baseCurrency,
      cost: product.cost,
      taxName: product.taxName,
      taxRate: product.taxRate,
      brandId: brand.id,
      brandName: brand.name,
      unit: productUnit.abbreviation,
    })
    .from(product)
    .leftJoin(brand, and(eq(product.brandId, brand.id), isNull(brand.deletedAt)))
    .leftJoin(productUnit, eq(product.unitId, productUnit.id))
    .where(detailVisibility(slug))
    .limit(1);

  if (!row) {
    return null;
  }

  const [items, images, specs, documents, crumbs, amounts, exchange, logos] = await Promise.all([
    ctx.db
      .select()
      .from(productItem)
      .where(and(eq(productItem.productId, row.id), eq(productItem.isActive, true)))
      .orderBy(asc(productItem.sortOrder), asc(productItem.id)),
    queryGallery(ctx, row.id),
    ctx.db
      .select({
        group: productDetail.group,
        label: productDetail.label,
        value: productDetail.value,
      })
      .from(productDetail)
      .where(eq(productDetail.productId, row.id))
      .orderBy(asc(productDetail.sortOrder), asc(productDetail.id)),
    queryDocuments(ctx, row.id),
    queryCategoryCrumbs(ctx, row.id),
    resolveBaseAmounts(ctx, [row.id]),
    queryExchange(ctx, row.currency),
    row.brandId
      ? queryBrandLogoUrls(ctx, [row.brandId])
      : Promise.resolve(new Map<string, string>()),
  ]);

  const variants: VariantDTO[] = items.map((item) =>
    toVariant(item, images.find((image) => image.variantId === item.id)?.url ?? null),
  );

  return {
    product: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      isUnlisted: isUnlisted(row.status),
      brand: row.brandName
        ? { name: row.brandName, logoUrl: row.brandId ? (logos.get(row.brandId) ?? null) : null }
        : null,
      unit: row.unit,
      currency: row.currency,
      tax: toTax(row.taxName, row.taxRate),
      variants,
      images,
      specs,
      documents,
      crumbs,
      exchange,
    },
    pricing: {
      baseAmount: amounts.get(row.id) ?? null,
      cost: row.cost === null ? null : Number(row.cost),
      formulaByVariant: new Map(
        items.flatMap((item) => (item.priceFormula ? [[item.id, item.priceFormula] as const] : [])),
      ),
    },
  };
}
