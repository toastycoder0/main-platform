import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { product, productItem, productLink, productUnit } from '@/infrastructure/db/schema';
import {
  PUBLIC_DETAIL_STATUSES,
  PUBLIC_LISTING_STATUSES,
} from '@/modules/products/application/products.status';
import { resolveVisibleComplements } from '../application/product-details.complements';
import type { ComplementDTO, ComplementLink } from '../application/product-details.types';
import { queryCoverImageUrls } from './product-details.files';
import { toComplementVariant } from './product-details.mapper';
import { resolveBaseAmounts } from './product-details.prices';
import { getVariantStock } from './product-details.stock.query';

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

/**
 * Complements offered for the selected variant. Unlisted products are included
 * (that is the point of the status) but flagged so the UI never links to them.
 */
export async function getComplements(
  ctx: RequestContext,
  productId: string,
  selectedVariantId: string | null,
): Promise<ComplementDTO[]> {
  const visible = resolveVisibleComplements(
    await getComplementLinks(ctx, productId),
    selectedVariantId,
  );

  if (visible.length === 0) {
    return [];
  }

  const ids = visible.map((entry) => entry.linkedProductId);

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

  const rowById = new Map(rows.map((row) => [row.id, row]));
  const stock = await getVariantStock(
    ctx,
    items.map((item) => item.id),
  );

  return visible.flatMap(({ linkedProductId, lockedVariantId }) => {
    const row = rowById.get(linkedProductId);
    const variants = items
      .filter((item) => item.productId === linkedProductId)
      .map((item) => toComplementVariant(item, stock.get(item.id)));
    const lockIsValid = lockedVariantId === null || variants.some((v) => v.id === lockedVariantId);

    if (!row || variants.length === 0 || !lockIsValid) {
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
        lockedVariantId,
        variants,
      },
    ];
  });
}
