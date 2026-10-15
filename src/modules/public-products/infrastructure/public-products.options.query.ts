import { and, asc, eq, isNull } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { brand, category, productUnit, tag } from '@/infrastructure/db/schema';
import type {
  PublicCategoryRow,
  PublicProductFilterOptions,
} from '../application/public-products.types';

export function getPublicCategoryRows(ctx: RequestContext): Promise<PublicCategoryRow[]> {
  return ctx.db
    .select({
      id: category.id,
      parentId: category.parentId,
      slug: category.slug,
      name: category.name,
      sortOrder: category.sortOrder,
    })
    .from(category)
    .where(and(isNull(category.deletedAt), eq(category.isActive, true)))
    .orderBy(asc(category.sortOrder), asc(category.id));
}

export async function getProductFilterOptions(
  ctx: RequestContext,
): Promise<PublicProductFilterOptions> {
  const [brands, tags, units] = await Promise.all([
    ctx.db
      .select({ slug: brand.slug, name: brand.name })
      .from(brand)
      .where(and(isNull(brand.deletedAt), eq(brand.isActive, true)))
      .orderBy(asc(brand.sortOrder), asc(brand.id)),
    ctx.db
      .select({ slug: tag.slug, name: tag.name })
      .from(tag)
      .where(and(isNull(tag.deletedAt), eq(tag.isActive, true)))
      .orderBy(asc(tag.sortOrder), asc(tag.id)),
    ctx.db
      .select({ slug: productUnit.slug, name: productUnit.name })
      .from(productUnit)
      .where(and(isNull(productUnit.deletedAt), eq(productUnit.isActive, true)))
      .orderBy(asc(productUnit.sortOrder), asc(productUnit.id)),
  ]);

  return { brands, tags, units };
}
