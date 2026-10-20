import { and, asc, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { productImage, productItem } from '@/infrastructure/db/schema';
import { type FileDTO, listFilesByOwners } from '@/infrastructure/files/service';
import {
  type ProductCardAvailability,
  type ProductCardVariantInput,
  toCardAvailability,
} from '../application/products.card';

interface VariantRow {
  id: string;
  productId: string;
  title: string;
  managesInventory: boolean;
  leadTimeDays: number;
}

async function queryActiveVariants(
  ctx: RequestContext,
  productIds: string[],
): Promise<VariantRow[]> {
  const rows = await ctx.db
    .select({
      id: productItem.id,
      productId: productItem.productId,
      title: productItem.title,
      managesInventory: productItem.managesInventory,
      leadTimeDays: productItem.leadTimeDays,
    })
    .from(productItem)
    .where(and(inArray(productItem.productId, productIds), eq(productItem.isActive, true)))
    .orderBy(asc(productItem.productId), asc(productItem.sortOrder), asc(productItem.id));

  return rows;
}

function groupVariantsByProduct(rows: VariantRow[]): Map<string, VariantRow[]> {
  const grouped = new Map<string, VariantRow[]>();

  for (const row of rows) {
    const variants = grouped.get(row.productId) ?? [];
    variants.push(row);
    grouped.set(row.productId, variants);
  }

  return grouped;
}

async function queryFirstImageIdByVariant(
  ctx: RequestContext,
  variantIds: string[],
): Promise<Map<string, string>> {
  const firstImageIdByVariant = new Map<string, string>();

  if (variantIds.length === 0) {
    return firstImageIdByVariant;
  }

  const images = await ctx.db
    .select({ id: productImage.id, itemId: productImage.itemId })
    .from(productImage)
    .where(
      and(
        inArray(productImage.itemId, variantIds),
        eq(productImage.isVisible, true),
        or(isNull(productImage.section), ne(productImage.section, 'details')),
      ),
    )
    .orderBy(asc(productImage.sortOrder), asc(productImage.id));

  for (const image of images) {
    if (image.itemId && !firstImageIdByVariant.has(image.itemId)) {
      firstImageIdByVariant.set(image.itemId, image.id);
    }
  }

  return firstImageIdByVariant;
}

function buildVariantInputs(
  variants: VariantRow[],
  firstImageIdByVariant: Map<string, string>,
  filesByOwner: Map<string, FileDTO[]>,
): ProductCardVariantInput[] {
  return variants.map((variant) => {
    const imageId = firstImageIdByVariant.get(variant.id);

    return {
      title: variant.title,
      imageUrl: imageId ? (filesByOwner.get(imageId)?.[0]?.url ?? null) : null,
      managesInventory: variant.managesInventory,
      leadTimeDays: variant.leadTimeDays,
    };
  });
}

/**
 * Card metadata for a batch of products: active variants, their first visible
 * image and the availability of the first active variant (same fallback as the
 * product detail page).
 */
export async function queryCardAvailability(
  ctx: RequestContext,
  productIds: string[],
): Promise<Map<string, ProductCardAvailability>> {
  const result = new Map<string, ProductCardAvailability>();

  if (productIds.length === 0) {
    return result;
  }

  const rows = await queryActiveVariants(ctx, productIds);
  const variantsByProduct = groupVariantsByProduct(rows);
  const firstImageIdByVariant = await queryFirstImageIdByVariant(
    ctx,
    rows.map((row) => row.id),
  );
  const filesByOwner = await listFilesByOwners(
    ctx.db,
    { entity: 'product_images', scope: 'image' },
    [...firstImageIdByVariant.values()],
  );

  for (const productId of productIds) {
    const variants = variantsByProduct.get(productId) ?? [];
    const inputs = buildVariantInputs(variants, firstImageIdByVariant, filesByOwner);
    result.set(productId, toCardAvailability(inputs));
  }

  return result;
}
