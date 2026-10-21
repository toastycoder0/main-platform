import { and, asc, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import { toOpenField } from '@/infrastructure/catalog/catalog.mapper';
import { resolveBaseAmounts } from '@/infrastructure/catalog/catalog.prices';
import { getVariantStock } from '@/infrastructure/catalog/catalog.stock.query';
import type { RequestContext } from '@/infrastructure/context/types';
import { product, productImage, productItem, productUnit } from '@/infrastructure/db/schema';
import { listFilesByOwners } from '@/infrastructure/files/service';
import {
  type ProductStatus,
  PUBLIC_DETAIL_STATUSES,
} from '@/modules/products/application/products.status';
import type { CartSource, CartVariantSource } from '../application/cart.types';

const IMAGE_FILES = { entity: 'product_images', scope: 'image' } as const;

type VariantRow = typeof productItem.$inferSelect;

interface ProductSourceRow {
  id: string;
  slug: string;
  title: string;
  status: ProductStatus;
  deletedAt: Date | null;
  currency: string;
  cost: string | null;
  unit: string | null;
}

interface ImageMaps {
  covers: Map<string, string>;
  variants: Map<string, string>;
}

function isPublic(status: ProductStatus): boolean {
  return PUBLIC_DETAIL_STATUSES.some((candidate) => candidate === status);
}

function toCartVariant(
  row: VariantRow,
  imageUrl: string | null,
  stock: { available: number } | undefined,
): CartVariantSource {
  return {
    id: row.id,
    title: row.title,
    isActive: row.isActive,
    managesInventory: row.managesInventory,
    availableStock: row.managesInventory ? (stock?.available ?? 0) : null,
    minOrderQty: row.minOrderQty,
    incrementQty: row.incrementQty,
    leadTimeDays: row.leadTimeDays,
    pricingModel: row.pricingModel,
    openFields: row.options.map(toOpenField),
    priceFormula: row.priceFormula,
    imageUrl,
  };
}

interface ImageRow {
  id: string;
  productId: string;
  itemId: string | null;
}

function recordImage(maps: ImageMaps, row: ImageRow, url: string): void {
  if (!maps.covers.has(row.productId)) {
    maps.covers.set(row.productId, url);
  }

  const key = `${row.productId}:${row.itemId}`;

  if (row.itemId && !maps.variants.has(key)) {
    maps.variants.set(key, url);
  }
}

/** Cover per product and first image per variant, in gallery order. */
async function queryImages(ctx: RequestContext, productIds: string[]): Promise<ImageMaps> {
  const maps: ImageMaps = { covers: new Map(), variants: new Map() };

  if (productIds.length === 0) {
    return maps;
  }

  const rows = await ctx.db
    .select({
      id: productImage.id,
      productId: productImage.productId,
      itemId: productImage.itemId,
    })
    .from(productImage)
    .where(
      and(
        inArray(productImage.productId, productIds),
        eq(productImage.isVisible, true),
        or(isNull(productImage.section), ne(productImage.section, 'details')),
      ),
    )
    .orderBy(asc(productImage.sortOrder), asc(productImage.id));

  const files = await listFilesByOwners(
    ctx.db,
    IMAGE_FILES,
    rows.map((row) => row.id),
  );

  for (const row of rows) {
    const url = files.get(row.id)?.[0]?.url;

    if (url) {
      recordImage(maps, row, url);
    }
  }

  return maps;
}

async function querySources(ctx: RequestContext, rows: ProductSourceRow[]): Promise<CartSource[]> {
  const ids = rows.map((row) => row.id);

  if (ids.length === 0) {
    return [];
  }

  const [items, amounts, images] = await Promise.all([
    ctx.db
      .select()
      .from(productItem)
      .where(inArray(productItem.productId, ids))
      .orderBy(asc(productItem.sortOrder), asc(productItem.id)),
    resolveBaseAmounts(ctx, ids),
    queryImages(ctx, ids),
  ]);

  const stock = await getVariantStock(
    ctx,
    items.map((item) => item.id),
  );

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    isAvailable: row.deletedAt === null && isPublic(row.status),
    currency: row.currency,
    unit: row.unit,
    baseAmount: amounts.get(row.id) ?? null,
    cost: row.cost === null ? null : Number(row.cost),
    coverImageUrl: images.covers.get(row.id) ?? null,
    variants: items
      .filter((item) => item.productId === row.id)
      .map((item) =>
        toCartVariant(
          item,
          images.variants.get(`${row.id}:${item.id}`) ?? null,
          stock.get(item.id),
        ),
      ),
  }));
}

/** Trusted snapshot of the products referenced by a cart, including unpublished ones. */
export async function getCartSources(
  ctx: RequestContext,
  productIds: string[],
): Promise<CartSource[]> {
  if (productIds.length === 0) {
    return [];
  }

  const rows = await ctx.db
    .select({
      id: product.id,
      slug: product.slug,
      title: product.title,
      status: product.status,
      deletedAt: product.deletedAt,
      currency: product.baseCurrency,
      cost: product.cost,
      unit: productUnit.abbreviation,
    })
    .from(product)
    .leftJoin(productUnit, eq(product.unitId, productUnit.id))
    .where(inArray(product.id, productIds));

  return querySources(ctx, rows);
}

/** Trusted snapshot of the products referenced by an add-to-cart payload. */
export async function findCartSources(
  ctx: RequestContext,
  slugs: string[],
): Promise<Map<string, CartSource>> {
  if (slugs.length === 0) {
    return new Map();
  }

  const rows = await ctx.db
    .select({
      id: product.id,
      slug: product.slug,
      title: product.title,
      status: product.status,
      deletedAt: product.deletedAt,
      currency: product.baseCurrency,
      cost: product.cost,
      unit: productUnit.abbreviation,
    })
    .from(product)
    .leftJoin(productUnit, eq(product.unitId, productUnit.id))
    .where(
      and(
        inArray(product.slug, slugs),
        isNull(product.deletedAt),
        inArray(product.status, [...PUBLIC_DETAIL_STATUSES]),
      ),
    );

  const sources = await querySources(ctx, rows);

  return new Map(sources.map((source) => [source.slug, source]));
}
