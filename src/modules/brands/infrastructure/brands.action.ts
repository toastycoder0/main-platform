'use server';

import { and, eq, isNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { brand } from '@/infrastructure/db/schema';
import { resolveUniqueSlug } from '@/infrastructure/db/unique-slug';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import { slugifyBrandName } from '../application/brands.slug';
import {
  brandParamsSchema,
  createBrandSchema,
  updateBrandSchema,
} from '../application/brands.validation';
import { syncBrandImage } from './brands.files';

export const createBrand = run(
  { permission: PERMISSIONS.admin.brands.create, input: createBrandSchema },
  async (ctx, { name, description, isActive, image }) => {
    const slug = await resolveUniqueSlug(
      ctx.db,
      brand,
      slugifyBrandName(name) || 'marca',
      'la marca',
    );

    const created = await ctx.db.transaction(async (tx) => {
      const [row] = await tx
        .select({ value: sql<number>`coalesce(max(${brand.sortOrder}), -1)` })
        .from(brand);

      const [inserted] = await tx
        .insert(brand)
        .values({
          slug,
          name,
          description: description || null,
          isActive: isActive ?? true,
          sortOrder: (row?.value ?? -1) + 1,
        })
        .returning({ id: brand.id });

      return inserted;
    });

    if (!created) {
      throw new AppError('internal', 'No se pudo crear la marca');
    }

    if (image) {
      await syncBrandImage(ctx.db, created.id, ctx.session.user.id, image);
    }

    revalidatePath('/dashboard/brands');
    redirect('/dashboard/brands');
  },
);

export const updateBrand = run(
  { permission: PERMISSIONS.admin.brands.edit, input: updateBrandSchema },
  async (ctx, { id, name, description, isActive, image }) => {
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

    if (image !== undefined) {
      await syncBrandImage(ctx.db, id, ctx.session.user.id, image);
    }

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
