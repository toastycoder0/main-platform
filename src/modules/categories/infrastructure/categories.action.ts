'use server';

import { revalidatePath } from 'next/cache';
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
    await createCategoryRepo(ctx, data);
    revalidatePath('/dashboard/categories');
  },
);

export const updateCategory = run(
  { permission: PERMISSIONS.admin.categories.edit, input: updateCategorySchema },
  async (ctx, data) => {
    await updateCategoryRepo(ctx, data.id, data);
    revalidatePath('/dashboard/categories');
  },
);

export const archiveCategory = run(
  { permission: PERMISSIONS.admin.categories.delete, input: categoryParamsSchema },
  async (ctx, data) => {
    await archiveCategoryRepo(ctx, data.id);
    revalidatePath('/dashboard/categories');
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
