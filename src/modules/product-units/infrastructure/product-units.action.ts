'use server';

import { and, eq, isNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { productUnit } from '@/infrastructure/db/schema';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import { uniqueSlug } from '@/shared/utils/slug';
import {
  createProductUnitSchema,
  productUnitParamsSchema,
  updateProductUnitSchema,
} from '../application/product-units.validation';

export const createProductUnit = run(
  { permission: PERMISSIONS.admin.productUnits.create, input: createProductUnitSchema },
  async (ctx, { name, abbreviation, taxCode, isActive }) => {
    const slug = uniqueSlug(name);

    await ctx.db.transaction(async (tx) => {
      const [row] = await tx
        .select({ value: sql<number>`coalesce(max(${productUnit.sortOrder}), -1)` })
        .from(productUnit);

      await tx.insert(productUnit).values({
        slug,
        name,
        abbreviation: abbreviation || null,
        taxCode: taxCode || null,
        isActive: isActive ?? true,
        sortOrder: (row?.value ?? -1) + 1,
      });
    });

    revalidatePath('/dashboard/product-units');
    redirect('/dashboard/product-units');
  },
);

export const updateProductUnit = run(
  { permission: PERMISSIONS.admin.productUnits.edit, input: updateProductUnitSchema },
  async (ctx, { id, name, abbreviation, taxCode, isActive }) => {
    const [existing] = await ctx.db
      .select({ id: productUnit.id })
      .from(productUnit)
      .where(and(eq(productUnit.id, id), isNull(productUnit.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new AppError('not_found');
    }

    await ctx.db
      .update(productUnit)
      .set({
        name,
        abbreviation: abbreviation || null,
        taxCode: taxCode || null,
        isActive: isActive ?? true,
      })
      .where(eq(productUnit.id, id));

    revalidatePath('/dashboard/product-units');
    redirect('/dashboard/product-units');
  },
);

export const archiveProductUnit = run(
  { permission: PERMISSIONS.admin.productUnits.delete, input: productUnitParamsSchema },
  async (ctx, { id }) => {
    const [existing] = await ctx.db
      .select({ id: productUnit.id })
      .from(productUnit)
      .where(and(eq(productUnit.id, id), isNull(productUnit.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new AppError('not_found');
    }

    await ctx.db.update(productUnit).set({ deletedAt: new Date() }).where(eq(productUnit.id, id));

    revalidatePath('/dashboard/product-units');
    redirect('/dashboard/product-units');
  },
);
