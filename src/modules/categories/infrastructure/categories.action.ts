'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import {
  categoryParamsSchema,
  createCategorySchema,
  moveCategorySchema,
  reorderCategorySchema,
  toggleCategoryActiveSchema,
  updateCategorySchema,
} from '../application/categories.validation';
import { syncCategoryImage } from './categories.files';
import { findCategoryById } from './categories.query';
import {
  archiveCategory as archiveCategoryRepo,
  createCategory as createCategoryRepo,
  moveCategory as moveCategoryRepo,
  reorderCategory as reorderCategoryRepo,
  toggleCategoryActive as toggleCategoryActiveRepo,
  updateCategory as updateCategoryRepo,
} from './categories.repository';

export const createCategory = run(
  { permission: PERMISSIONS.admin.categories.create, input: createCategorySchema },
  async (ctx, data) => {
    const created = await createCategoryRepo(ctx, data);
    if (data.image) {
      await syncCategoryImage(ctx.db, created.id, ctx.session.user.id, data.image);
    }
    revalidatePath('/dashboard/categories');
    redirect('/dashboard/categories');
  },
);

export const updateCategory = run(
  { permission: PERMISSIONS.admin.categories.edit, input: updateCategorySchema },
  async (ctx, data) => {
    const current = await findCategoryById(ctx, data.id);

    await updateCategoryRepo(ctx, data.id, data);

    if (data.parentId !== undefined && data.parentId !== current.parentId) {
      await moveCategoryRepo(ctx, data.id, data.parentId);
    }

    if (data.image !== undefined) {
      await syncCategoryImage(ctx.db, data.id, ctx.session.user.id, data.image);
    }

    revalidatePath('/dashboard/categories');
    redirect('/dashboard/categories');
  },
);

export const archiveCategory = run(
  { permission: PERMISSIONS.admin.categories.delete, input: categoryParamsSchema },
  async (ctx, data) => {
    await archiveCategoryRepo(ctx, data.id);
    revalidatePath('/dashboard/categories');
    redirect('/dashboard/categories');
  },
);

export const reorderCategory = run(
  { permission: PERMISSIONS.admin.categories.edit, input: reorderCategorySchema },
  async (ctx, data) => {
    await reorderCategoryRepo(ctx, data.id, data.direction);
    revalidatePath('/dashboard/categories');
  },
);

export const moveCategory = run(
  { permission: PERMISSIONS.admin.categories.edit, input: moveCategorySchema },
  async (ctx, data) => {
    const result = await moveCategoryRepo(ctx, data.id, data.newParentId ?? null);
    revalidatePath('/dashboard/categories');
    return result;
  },
);

export const toggleCategoryActive = run(
  { permission: PERMISSIONS.admin.categories.edit, input: toggleCategoryActiveSchema },
  async (ctx, data) => {
    await toggleCategoryActiveRepo(ctx, data.id, data.isActive);
    revalidatePath('/dashboard/categories');
  },
);
