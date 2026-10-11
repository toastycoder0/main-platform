import { randomBytes } from 'node:crypto';
import { and, asc, count, eq, isNull, ne, type SQL, sql } from 'drizzle-orm';
import type { RequestContext } from '@/infrastructure/context/types';
import { generateId } from '@/infrastructure/db/id';
import { category } from '@/infrastructure/db/schema';
import { AppError } from '@/shared/errors';
import { slugify } from '@/shared/utils/slug';
import type {
  CreateCategorySchema,
  UpdateCategorySchema,
} from '../application/categories.validation';
import { findCategoryById } from './categories.query';

type CategoryRow = typeof category.$inferSelect;
type TransactionClient = { execute: (query: SQL) => Promise<unknown> };

const ROOT_SORT_GROUP_KEY = '__root__';

async function acquireSiblingSortLock(
  tx: TransactionClient,
  parentId: string | null,
): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${parentId ?? ROOT_SORT_GROUP_KEY}), 0)`,
  );
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

async function generateUniqueSlug(
  ctx: RequestContext,
  base: string,
  parentId: string | null,
): Promise<string> {
  const sanitized = slugify(base) || 'categoria';

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? sanitized : `${sanitized}-${randomBytes(2).toString('hex')}`;

    const [existing] = await ctx.db
      .select({ id: category.id })
      .from(category)
      .where(
        and(
          eq(category.slug, candidate),
          isNull(category.deletedAt),
          parentId ? eq(category.parentId, parentId) : isNull(category.parentId),
        ),
      )
      .limit(1);

    if (!existing) {
      return candidate;
    }
  }

  throw new AppError('internal', 'No se pudo generar un slug único para la categoría');
}

function assertNotOwnDescendant(existingPath: string, newParentPath: string): void {
  if (newParentPath === existingPath || newParentPath.startsWith(`${existingPath}/`)) {
    throw new AppError(
      'invalid_input',
      'No se puede mover una categoría dentro de uno de sus descendientes',
    );
  }
}

export async function createCategory(
  ctx: RequestContext,
  data: CreateCategorySchema,
): Promise<CategoryRow> {
  const id = generateId('cat');

  let path: string;

  if (!data.parentId) {
    path = id;
  } else {
    const parentResult = await findCategoryById(ctx, data.parentId);
    path = `${parentResult.path}/${id}`;
  }

  const slug = await generateUniqueSlug(ctx, data.name, data.parentId ?? null);

  const created = await ctx.db.transaction(async (tx) => {
    await acquireSiblingSortLock(tx, data.parentId ?? null);

    const [maxRow] = await tx
      .select({ maxSort: sql<number>`COALESCE(MAX(${category.sortOrder}), -1)` })
      .from(category)
      .where(
        and(
          data.parentId ? eq(category.parentId, data.parentId) : isNull(category.parentId),
          isNull(category.deletedAt),
        ),
      );

    const sortOrder = (maxRow?.maxSort ?? -1) + 1;

    const [createdRow] = await tx
      .insert(category)
      .values({
        id,
        parentId: data.parentId ?? null,
        slug,
        name: data.name,
        description: data.description ?? null,
        path,
        isActive: data.isActive ?? true,
        sortOrder,
      })
      .returning();

    if (!createdRow) {
      throw new AppError('internal', 'No se pudo crear la categoría');
    }

    return createdRow;
  });

  ctx.logger.info({ categoryId: id }, 'Category created');

  return created;
}

export async function updateCategory(
  ctx: RequestContext,
  id: string,
  data: UpdateCategorySchema,
): Promise<CategoryRow> {
  const existing = await findCategoryById(ctx, id);

  const updateData: Partial<typeof category.$inferInsert> = {
    name: data.name,
    description: data.description ?? existing.description,
  };

  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  const [updated] = await ctx.db
    .update(category)
    .set(updateData)
    .where(eq(category.id, id))
    .returning();

  if (!updated) {
    throw new AppError('not_found');
  }

  ctx.logger.info({ categoryId: id }, 'Category updated');

  return updated;
}

export async function reorderCategory(
  ctx: RequestContext,
  id: string,
  direction: 'up' | 'down',
): Promise<void> {
  const cat = await findCategoryById(ctx, id);

  await ctx.db.transaction(async (tx) => {
    await acquireSiblingSortLock(tx, cat.parentId);

    const siblings = await tx
      .select({ id: category.id, sortOrder: category.sortOrder })
      .from(category)
      .where(
        and(
          cat.parentId ? eq(category.parentId, cat.parentId) : isNull(category.parentId),
          isNull(category.deletedAt),
        ),
      )
      .orderBy(asc(category.sortOrder), asc(category.id));

    const currentIndex = siblings.findIndex((s) => s.id === cat.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    const [current, target] = pickSwapTargets(siblings, currentIndex, targetIndex);

    await tx
      .update(category)
      .set({ sortOrder: target.sortOrder })
      .where(eq(category.id, current.id));
    await tx
      .update(category)
      .set({ sortOrder: current.sortOrder })
      .where(eq(category.id, target.id));
  });

  ctx.logger.info({ categoryId: id, direction }, 'Category reordered');
}

function pickSwapTargets(
  siblings: { id: string; sortOrder: number }[],
  currentIndex: number,
  targetIndex: number,
): [{ id: string; sortOrder: number }, { id: string; sortOrder: number }] {
  if (currentIndex === -1) {
    throw new AppError('not_found');
  }

  if (targetIndex < 0 || targetIndex >= siblings.length) {
    throw new AppError('invalid_input', 'No se puede reordenar más la categoría');
  }

  const current = siblings[currentIndex];
  const target = siblings[targetIndex];

  if (!current || !target) {
    throw new AppError('internal', 'No se pudo reordenar la categoría');
  }

  return [current, target];
}

async function moveCategoryInTransaction(
  ctx: RequestContext,
  categoryId: string,
  newParentId: string | null,
  oldPath: string,
  newPath: string,
): Promise<void> {
  await ctx.db.transaction(async (tx) => {
    await acquireSiblingSortLock(tx, newParentId);

    await tx
      .update(category)
      .set({ parentId: newParentId, path: newPath })
      .where(eq(category.id, categoryId));

    await tx.execute(
      sql`UPDATE ${category} SET path = REPLACE(path, ${oldPath}, ${newPath}) WHERE path = ${oldPath} OR path LIKE ${`${escapeLikePattern(oldPath)}/%`} ESCAPE '\\'`,
    );

    const [maxRow] = await tx
      .select({ maxSort: sql<number>`COALESCE(MAX(${category.sortOrder}), -1)` })
      .from(category)
      .where(
        and(
          newParentId ? eq(category.parentId, newParentId) : isNull(category.parentId),
          isNull(category.deletedAt),
          ne(category.id, categoryId),
        ),
      );

    const newSortOrder = (maxRow?.maxSort ?? -1) + 1;

    await tx.update(category).set({ sortOrder: newSortOrder }).where(eq(category.id, categoryId));
  });
}

export async function moveCategory(
  ctx: RequestContext,
  categoryId: string,
  newParentId: string | null,
): Promise<{ previousParentId: string | null }> {
  const cat = await findCategoryById(ctx, categoryId);
  const previousParentId = cat.parentId;

  if (newParentId === null && cat.parentId === null) {
    throw new AppError('invalid_input', 'La categoría ya está en la raíz');
  }

  if (newParentId === cat.id) {
    throw new AppError('invalid_input', 'No se puede mover una categoría dentro de sí misma');
  }

  if (newParentId !== null) {
    const newParent = await findCategoryById(ctx, newParentId);
    assertNotOwnDescendant(cat.path, newParent.path);
  }

  const oldPath = cat.path;
  const newPath = newParentId
    ? `${(await findCategoryById(ctx, newParentId)).path}/${categoryId}`
    : categoryId;

  await moveCategoryInTransaction(ctx, categoryId, newParentId, oldPath, newPath);

  ctx.logger.info({ categoryId, oldPath, newPath }, 'Category moved');

  return { previousParentId };
}

export async function archiveCategory(ctx: RequestContext, categoryId: string): Promise<void> {
  await findCategoryById(ctx, categoryId);

  const [children] = await ctx.db
    .select({ count: count() })
    .from(category)
    .where(and(eq(category.parentId, categoryId), isNull(category.deletedAt)));

  if (children && children.count > 0) {
    throw new AppError(
      'invalid_input',
      'No se puede archivar una categoría que tiene subcategorías activas',
    );
  }

  await ctx.db.update(category).set({ deletedAt: new Date() }).where(eq(category.id, categoryId));

  ctx.logger.info({ categoryId }, 'Category archived');
}

export async function toggleCategoryActive(
  ctx: RequestContext,
  categoryId: string,
  isActive: boolean,
): Promise<void> {
  await findCategoryById(ctx, categoryId);

  await ctx.db.update(category).set({ isActive }).where(eq(category.id, categoryId));

  ctx.logger.info({ categoryId, isActive }, 'Category active toggled');
}
