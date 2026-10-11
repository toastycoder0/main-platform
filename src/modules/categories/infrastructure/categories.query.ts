import { and, asc, eq, isNull } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { category } from '@/infrastructure/db/schema';
import { AppError } from '@/shared/errors';
import type { CategoryTreeRow } from '../application/categories.types';

export async function findCategoryById(ctx: RequestContext, id: string) {
  const [row] = await ctx.db
    .select()
    .from(category)
    .where(and(eq(category.id, id), isNull(category.deletedAt)))
    .limit(1);

  if (!row) {
    throw new AppError('not_found');
  }

  return row;
}

export async function getCategoryTree(ctx: RequestContext): Promise<CategoryTreeRow[]> {
  const rows = await ctx.db
    .select({
      id: category.id,
      parentId: category.parentId,
      slug: category.slug,
      name: category.name,
      description: category.description,
      path: category.path,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    })
    .from(category)
    .where(isNull(category.deletedAt))
    .orderBy(asc(category.parentId), asc(category.sortOrder), asc(category.id));

  return rows.map((r) => ({
    ...r,
    parentId: r.parentId ?? null,
    description: r.description ?? null,
  }));
}
