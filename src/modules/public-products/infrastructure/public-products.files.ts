import { and, asc, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { file, productImage } from '@/infrastructure/db/schema';
import { storageKeyToUrl } from '@/infrastructure/storage/urls';

async function queryFirstFileUrls(
  ctx: RequestContext,
  locator: { entity: string; scope: string },
  ownerIds: string[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();

  if (ownerIds.length === 0) {
    return urls;
  }

  const rows = await ctx.db
    .select({ ownerId: file.ownerId, key: file.key })
    .from(file)
    .where(
      and(
        eq(file.entity, locator.entity),
        eq(file.scope, locator.scope),
        inArray(file.ownerId, ownerIds),
      ),
    )
    .orderBy(asc(file.sortOrder), asc(file.id));

  for (const row of rows) {
    if (row.key && row.ownerId && !urls.has(row.ownerId)) {
      urls.set(row.ownerId, storageKeyToUrl(row.key));
    }
  }

  return urls;
}

export function queryBrandLogoUrls(
  ctx: RequestContext,
  brandIds: string[],
): Promise<Map<string, string>> {
  return queryFirstFileUrls(ctx, { entity: 'brand', scope: 'image' }, brandIds);
}

export async function queryFirstProductImageUrls(
  ctx: RequestContext,
  productIds: string[],
): Promise<Map<string, string>> {
  if (productIds.length === 0) {
    return new Map();
  }

  const rows = await ctx.db
    .select({ id: productImage.id, productId: productImage.productId })
    .from(productImage)
    .where(
      and(
        inArray(productImage.productId, productIds),
        eq(productImage.isVisible, true),
        or(isNull(productImage.section), ne(productImage.section, 'details')),
      ),
    )
    .orderBy(asc(productImage.sortOrder), asc(productImage.id));

  const firstImageIdByProduct = new Map<string, string>();
  for (const row of rows) {
    if (!firstImageIdByProduct.has(row.productId)) {
      firstImageIdByProduct.set(row.productId, row.id);
    }
  }

  const urlByImage = await queryFirstFileUrls(ctx, { entity: 'product_images', scope: 'image' }, [
    ...firstImageIdByProduct.values(),
  ]);

  const urlByProduct = new Map<string, string>();
  for (const [productId, imageId] of firstImageIdByProduct) {
    const url = urlByImage.get(imageId);
    if (url) {
      urlByProduct.set(productId, url);
    }
  }

  return urlByProduct;
}
