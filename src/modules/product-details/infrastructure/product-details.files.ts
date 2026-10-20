import { and, asc, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { productImage } from '@/infrastructure/db/schema';
import { listFilesByOwners } from '@/infrastructure/files/service';

const IMAGE_FILES = { entity: 'product_images', scope: 'image' } as const;
const DOCUMENT_FILES = { entity: 'product_documents', scope: 'document' } as const;
const BRAND_FILES = { entity: 'brand', scope: 'image' } as const;

async function firstUrls(
  ctx: RequestContext,
  locator: { entity: string; scope: string },
  ownerIds: string[],
): Promise<Map<string, string>> {
  const filesByOwner = await listFilesByOwners(ctx.db, locator, ownerIds);
  const urls = new Map<string, string>();

  for (const [ownerId, files] of filesByOwner) {
    const first = files[0];
    if (first) {
      urls.set(ownerId, first.url);
    }
  }

  return urls;
}

export function queryImageUrls(ctx: RequestContext, imageIds: string[]) {
  return firstUrls(ctx, IMAGE_FILES, imageIds);
}

export function queryDocumentUrls(ctx: RequestContext, documentIds: string[]) {
  return firstUrls(ctx, DOCUMENT_FILES, documentIds);
}

export function queryBrandLogoUrls(ctx: RequestContext, brandIds: string[]) {
  return firstUrls(ctx, BRAND_FILES, brandIds);
}

/** First visible gallery image of each product, used by cards and complements. */
export async function queryCoverImageUrls(
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

  const urlByImage = await queryImageUrls(
    ctx,
    rows.map((row) => row.id),
  );
  const urlByProduct = new Map<string, string>();

  for (const row of rows) {
    const url = urlByImage.get(row.id);
    if (url && !urlByProduct.has(row.productId)) {
      urlByProduct.set(row.productId, url);
    }
  }

  return urlByProduct;
}
