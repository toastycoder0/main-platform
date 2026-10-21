import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { resolveBaseAmounts } from '@/infrastructure/catalog/catalog.prices';
import { getVariantStock } from '@/infrastructure/catalog/catalog.stock.query';
import type { RequestContext } from '@/infrastructure/context/types';
import { product, productItem, productLink, productUnit } from '@/infrastructure/db/schema';
import {
  PUBLIC_DETAIL_STATUSES,
  PUBLIC_LISTING_STATUSES,
} from '@/modules/products/application/products.status';
import type { ComplementDTO, ComplementLink } from '../application/product-details.types';
import { queryCoverImageUrls } from './product-details.files';
import { toComplementVariant } from './product-details.mapper';

export function getComplementLinks(
  ctx: RequestContext,
  productId: string,
): Promise<ComplementLink[]> {
  return ctx.db
    .select({
      linkedProductId: productLink.linkedProductId,
      sourceVariantId: productLink.itemId,
      targetVariantId: productLink.linkedItemId,
    })
    .from(productLink)
    .innerJoin(product, eq(productLink.linkedProductId, product.id))
    .where(
      and(
        eq(productLink.type, 'complement'),
        eq(productLink.productId, productId),
        isNull(product.deletedAt),
        inArray(product.status, [...PUBLIC_DETAIL_STATUSES]),
      ),
    )
    .orderBy(asc(productLink.sortOrder), asc(productLink.id));
}

export interface ProductComplementsSource {
  links: ComplementLink[];
  complements: ComplementDTO[];
}

/**
 * Every complement the product can offer, regardless of the selected variant.
 * The client resolves which ones apply, so switching variants never refetches.
 * Unlisted products are included (that is the point of the status) but flagged
 * so the UI never links to them.
 */
export async function getProductComplements(
  ctx: RequestContext,
  productId: string,
): Promise<ProductComplementsSource> {
  const links = await getComplementLinks(ctx, productId);
  const ids = [...new Set(links.map((link) => link.linkedProductId))];

  if (ids.length === 0) {
    return { links, complements: [] };
  }

  const [rows, items, amounts, covers] = await Promise.all([
    ctx.db
      .select({
        id: product.id,
        slug: product.slug,
        title: product.title,
        status: product.status,
        currency: product.baseCurrency,
        unit: productUnit.abbreviation,
      })
      .from(product)
      .leftJoin(productUnit, eq(product.unitId, productUnit.id))
      .where(inArray(product.id, ids)),
    ctx.db
      .select()
      .from(productItem)
      .where(and(inArray(productItem.productId, ids), eq(productItem.isActive, true)))
      .orderBy(asc(productItem.sortOrder), asc(productItem.id)),
    resolveBaseAmounts(ctx, ids),
    queryCoverImageUrls(ctx, ids),
  ]);

  const stock = await getVariantStock(
    ctx,
    items.map((item) => item.id),
  );

  const complements = rows.flatMap((row) => {
    const variants = items
      .filter((item) => item.productId === row.id)
      .map((item) => toComplementVariant(item, stock.get(item.id)));

    if (variants.length === 0) {
      return [];
    }

    return [
      {
        productId: row.id,
        slug: row.slug,
        title: row.title,
        imageUrl: covers.get(row.id) ?? null,
        unit: row.unit,
        currency: row.currency,
        baseAmount: amounts.get(row.id) ?? null,
        canOpen: PUBLIC_LISTING_STATUSES.some((status) => status === row.status),
        // The lock depends on the selected variant, so it is resolved in the client.
        lockedVariantId: null,
        variants,
      },
    ];
  });

  return { links, complements };
}
