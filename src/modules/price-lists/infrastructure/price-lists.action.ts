'use server';

import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { priceList, productPrice } from '@/infrastructure/db/schema';
import { resolveUniqueSlug } from '@/infrastructure/db/unique-slug';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import { slugifyPriceListName } from '../application/price-lists.slug';
import {
  createPriceListSchema,
  priceListParamsSchema,
  updatePriceListSchema,
} from '../application/price-lists.validation';

export const createPriceList = run(
  { permission: PERMISSIONS.admin.priceLists.create, input: createPriceListSchema },
  async (ctx, { name, description, isDefault }) => {
    const slug = await resolveUniqueSlug(
      ctx.db,
      priceList,
      slugifyPriceListName(name) || 'lista-de-precios',
      'la lista de precios',
    );

    await ctx.db.transaction(async (tx) => {
      const [row] = await tx
        .select({ value: sql<number>`coalesce(max(${priceList.sortOrder}), -1)` })
        .from(priceList);

      if (isDefault) {
        await tx.update(priceList).set({ isDefault: false }).where(eq(priceList.isDefault, true));
      }

      await tx.insert(priceList).values({
        slug,
        name,
        description: description || null,
        isDefault: isDefault ?? false,
        sortOrder: (row?.value ?? -1) + 1,
      });
    });

    revalidatePath('/dashboard/price-lists');
    redirect('/dashboard/price-lists');
  },
);

export const updatePriceList = run(
  { permission: PERMISSIONS.admin.priceLists.edit, input: updatePriceListSchema },
  async (ctx, { id, name, description, isDefault }) => {
    const [existing] = await ctx.db
      .select({ id: priceList.id })
      .from(priceList)
      .where(and(eq(priceList.id, id), isNull(priceList.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new AppError('not_found');
    }

    await ctx.db.transaction(async (tx) => {
      if (isDefault) {
        await tx
          .update(priceList)
          .set({ isDefault: false })
          .where(and(eq(priceList.isDefault, true), ne(priceList.id, id)));
      }

      await tx
        .update(priceList)
        .set({ name, description: description || null, isDefault: isDefault ?? false })
        .where(eq(priceList.id, id));
    });

    revalidatePath('/dashboard/price-lists');
    redirect('/dashboard/price-lists');
  },
);

export const archivePriceList = run(
  { permission: PERMISSIONS.admin.priceLists.delete, input: priceListParamsSchema },
  async (ctx, { id }) => {
    const [existing] = await ctx.db
      .select({ id: priceList.id })
      .from(priceList)
      .where(and(eq(priceList.id, id), isNull(priceList.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new AppError('not_found');
    }

    const [priceRow] = await ctx.db
      .select({ id: productPrice.id })
      .from(productPrice)
      .where(eq(productPrice.priceListId, id))
      .limit(1);

    if (priceRow) {
      throw new AppError(
        'invalid_input',
        'No se puede archivar una lista de precios que tiene productos asociados',
      );
    }

    await ctx.db.update(priceList).set({ deletedAt: new Date() }).where(eq(priceList.id, id));

    revalidatePath('/dashboard/price-lists');
    redirect('/dashboard/price-lists');
  },
);
