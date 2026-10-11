'use server';

import { randomBytes } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { DatabaseClient } from '@/infrastructure/db';
import { brand } from '@/infrastructure/db/schema';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import { slugifyBrandName } from '../application/brands.slug';
import {
  brandParamsSchema,
  createBrandSchema,
  updateBrandSchema,
} from '../application/brands.validation';

async function resolveUniqueBrandSlug(db: DatabaseClient, base: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;
    const [existing] = await db
      .select({ id: brand.id })
      .from(brand)
      .where(eq(brand.slug, candidate))
      .limit(1);

    if (!existing) {
      return candidate;
    }
  }

  throw new AppError('internal', 'No se pudo generar un slug único para la marca');
}

export const createBrand = run(
  { permission: PERMISSIONS.admin.brands.create, input: createBrandSchema },
  async (ctx, { name, description, isActive }) => {
    const slug = await resolveUniqueBrandSlug(ctx.db, slugifyBrandName(name) || 'marca');

    await ctx.db.transaction(async (tx) => {
      const [row] = await tx
        .select({ value: sql<number>`coalesce(max(${brand.sortOrder}), -1)` })
        .from(brand);

      await tx.insert(brand).values({
        slug,
        name,
        description: description || null,
        isActive: isActive ?? true,
        sortOrder: (row?.value ?? -1) + 1,
      });
    });

    revalidatePath('/dashboard/brands');
    redirect('/dashboard/brands');
  },
);

export const updateBrand = run(
  { permission: PERMISSIONS.admin.brands.edit, input: updateBrandSchema },
  async (ctx, { id, name, description, isActive }) => {
    const [existing] = await ctx.db
      .select({ id: brand.id })
      .from(brand)
      .where(and(eq(brand.id, id), isNull(brand.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new AppError('not_found');
    }

    await ctx.db
      .update(brand)
      .set({ name, description: description || null, isActive: isActive ?? true })
      .where(eq(brand.id, id));

    revalidatePath('/dashboard/brands');
    redirect('/dashboard/brands');
  },
);

export const archiveBrand = run(
  { permission: PERMISSIONS.admin.brands.delete, input: brandParamsSchema },
  async (ctx, { id }) => {
    const [existing] = await ctx.db
      .select({ id: brand.id })
      .from(brand)
      .where(and(eq(brand.id, id), isNull(brand.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new AppError('not_found');
    }

    await ctx.db.update(brand).set({ deletedAt: new Date() }).where(eq(brand.id, id));

    revalidatePath('/dashboard/brands');
    redirect('/dashboard/brands');
  },
);
