'use server';

import { randomBytes } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { DatabaseClient } from '@/infrastructure/db';
import { productUnit } from '@/infrastructure/db/schema';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import { slugifyProductUnitName } from '../application/product-units.slug';
import {
  createProductUnitSchema,
  productUnitParamsSchema,
  updateProductUnitSchema,
} from '../application/product-units.validation';

async function resolveUniqueProductUnitSlug(db: DatabaseClient, base: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;
    const [existing] = await db
      .select({ id: productUnit.id })
      .from(productUnit)
      .where(eq(productUnit.slug, candidate))
      .limit(1);

    if (!existing) {
      return candidate;
    }
  }

  throw new AppError('internal', 'No se pudo generar un slug único para la unidad');
}

export const createProductUnit = run(
  { permission: PERMISSIONS.admin.productUnits.create, input: createProductUnitSchema },
  async (ctx, { name, abbreviation, taxCode, isActive }) => {
    const slug = await resolveUniqueProductUnitSlug(
      ctx.db,
      slugifyProductUnitName(name) || 'unidad',
    );

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
