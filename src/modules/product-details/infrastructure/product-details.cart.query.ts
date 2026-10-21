import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { resolveBaseAmounts } from '@/infrastructure/catalog/catalog.prices';
import { getVariantStock } from '@/infrastructure/catalog/catalog.stock.query';
import type { RequestContext } from '@/infrastructure/context/types';
import { product, productItem, productUnit } from '@/infrastructure/db/schema';
import { PUBLIC_DETAIL_STATUSES } from '@/modules/products/application/products.status';
import type { CartSource } from '../application/product-details.cart';
import { toCartVariant } from './product-details.mapper';

/** Trusted, server-side snapshot of every product referenced by the submitted lines. */
export async function findCartSources(
  ctx: RequestContext,
  slugs: string[],
): Promise<Map<string, CartSource>> {
  const rows = await ctx.db
    .select({
      id: product.id,
      slug: product.slug,
      title: product.title,
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

  const ids = rows.map((row) => row.id);

  if (ids.length === 0) {
    return new Map();
  }

  const [items, amounts] = await Promise.all([
    ctx.db
      .select()
      .from(productItem)
      .where(and(inArray(productItem.productId, ids), eq(productItem.isActive, true)))
      .orderBy(asc(productItem.sortOrder), asc(productItem.id)),
    resolveBaseAmounts(ctx, ids),
  ]);

  const stock = await getVariantStock(
    ctx,
    items.map((item) => item.id),
  );

  return new Map(
    rows.map((row) => [
      row.slug,
      {
        title: row.title,
        currency: row.currency,
        unit: row.unit,
        baseAmount: amounts.get(row.id) ?? null,
        cost: row.cost === null ? null : Number(row.cost),
        variants: items
          .filter((item) => item.productId === row.id)
          .map((item) => toCartVariant(item, stock.get(item.id))),
      },
    ]),
  );
}
