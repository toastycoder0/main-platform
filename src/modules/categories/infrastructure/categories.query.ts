import { and, asc, eq, isNull, ne } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { category } from '@/infrastructure/db/schema';
import { listOwnerFiles } from '@/modules/files/infrastructure/files.repository';
import { AppError } from '@/shared/errors';
import type { CategoryFormDTO, CategoryTreeRow } from '../application/categories.types';

export async function findCategoryById(ctx: RequestContext, id: string): Promise<CategoryFormDTO> {
  const [row] = await ctx.db
    .select({
      id: category.id,
      name: category.name,
      description: category.description,
      slug: category.slug,
      path: category.path,
      parentId: category.parentId,
      isActive: category.isActive,
    })
    .from(category)
    .where(and(eq(category.id, id), isNull(category.deletedAt)))
    .limit(1);

  if (!row) {
    throw new AppError('not_found');
  }

  return {
    ...row,
    parentId: row.parentId ?? null,
    description: row.description ?? null,
  };
}

export async function getCategoryImage(
  ctx: RequestContext,
  categoryId: string,
): Promise<string | null> {
  const files = await listOwnerFiles(ctx.db, {
    entity: 'category',
    scope: 'image',
    ownerId: categoryId,
  });

  return files[0]?.url ?? null;
}

export interface CategoryOption {
  value: string;
  label: string;
}

export async function listCategoryOptions(
  ctx: RequestContext,
  excludeId?: string,
): Promise<CategoryOption[]> {
  const rows = await ctx.db
    .select({ id: category.id, name: category.name })
    .from(category)
    .where(and(isNull(category.deletedAt), excludeId ? ne(category.id, excludeId) : undefined))
    .orderBy(asc(category.name), asc(category.id));

  return rows.map((r) => ({ value: r.id, label: r.name }));
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
