import { and, asc, eq, inArray, isNull, ne } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { category } from '@/infrastructure/db/schema';
import { listFilesByOwners, listOwnerFiles } from '@/modules/files/infrastructure/files.repository';
import { AppError } from '@/shared/errors';
import type {
  CategoryFormDTO,
  CategoryTreeRow,
  HomeCategoryDTO,
  HomeRootCategoryDTO,
} from '../application/categories.types';

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

// Home showcase: only root categories (level 1) and their direct children
// (level 2). Deeper levels are intentionally discarded.
export async function getHomeCategories(ctx: RequestContext): Promise<HomeRootCategoryDTO[]> {
  const roots = await ctx.db
    .select({ id: category.id, name: category.name, slug: category.slug })
    .from(category)
    .where(and(isNull(category.deletedAt), eq(category.isActive, true), isNull(category.parentId)))
    .orderBy(asc(category.sortOrder), asc(category.id));

  if (roots.length === 0) {
    return [];
  }

  const rootIds = roots.map((r) => r.id);

  const children = await ctx.db
    .select({
      id: category.id,
      parentId: category.parentId,
      name: category.name,
      slug: category.slug,
    })
    .from(category)
    .where(
      and(
        isNull(category.deletedAt),
        eq(category.isActive, true),
        inArray(category.parentId, rootIds),
      ),
    )
    .orderBy(asc(category.sortOrder), asc(category.id));

  const imageFiles = await listFilesByOwners(
    ctx.db,
    { entity: 'category', scope: 'image' },
    children.map((c) => c.id),
  );

  const childrenByRoot = new Map<string, HomeCategoryDTO[]>();
  for (const child of children) {
    if (!child.parentId) {
      continue;
    }
    const group = childrenByRoot.get(child.parentId) ?? [];
    group.push({
      id: child.id,
      name: child.name,
      slug: child.slug,
      imageUrl: imageFiles.get(child.id)?.[0]?.url ?? null,
    });
    childrenByRoot.set(child.parentId, group);
  }

  return roots.map((root) => ({
    id: root.id,
    name: root.name,
    slug: root.slug,
    children: childrenByRoot.get(root.id) ?? [],
  }));
}
