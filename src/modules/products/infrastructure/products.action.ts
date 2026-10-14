'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { createProductSchema, updateProductSchema } from '../application/products.validation';
import {
  createProduct as createProductRepo,
  updateProduct as updateProductRepo,
} from './products.repository';

export const createProduct = run(
  { permission: PERMISSIONS.admin.products.create, input: createProductSchema },
  async (ctx, data) => {
    await createProductRepo(ctx, ctx.session.user.id, data);
    revalidatePath('/dashboard/products');
    redirect('/dashboard/products');
  },
);

export const updateProduct = run(
  { permission: PERMISSIONS.admin.products.edit, input: updateProductSchema },
  async (ctx, data) => {
    await updateProductRepo(ctx, ctx.session.user.id, data);
    revalidatePath('/dashboard/products');
    redirect('/dashboard/products');
  },
);
