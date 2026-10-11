'use server';

import { randomBytes } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { DatabaseClient } from '@/infrastructure/db';
import { tag } from '@/infrastructure/db/schema';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import { slugifyTagName } from '../application/tags.slug';
import { createTagSchema, tagParamsSchema, updateTagSchema } from '../application/tags.validation';

async function resolveUniqueTagSlug(db: DatabaseClient, base: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;
    const [existing] = await db
      .select({ id: tag.id })
      .from(tag)
      .where(eq(tag.slug, candidate))
      .limit(1);

    if (!existing) {
      return candidate;
    }
  }

  throw new AppError('internal', 'No se pudo generar un slug único para la etiqueta');
}

export const createTag = run(
  { permission: PERMISSIONS.admin.tags.create, input: createTagSchema },
  async (ctx, { name, description, isActive }) => {
    const slug = await resolveUniqueTagSlug(ctx.db, slugifyTagName(name) || 'etiqueta');

    await ctx.db.transaction(async (tx) => {
      const [row] = await tx
        .select({ value: sql<number>`coalesce(max(${tag.sortOrder}), -1)` })
        .from(tag);

      await tx.insert(tag).values({
        slug,
        name,
        description: description || null,
        isActive: isActive ?? true,
        sortOrder: (row?.value ?? -1) + 1,
      });
    });

    revalidatePath('/dashboard/tags');
    redirect('/dashboard/tags');
  },
);

export const updateTag = run(
  { permission: PERMISSIONS.admin.tags.edit, input: updateTagSchema },
  async (ctx, { id, name, description, isActive }) => {
    const [existing] = await ctx.db
      .select({ id: tag.id })
      .from(tag)
      .where(and(eq(tag.id, id), isNull(tag.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new AppError('not_found');
    }

    await ctx.db
      .update(tag)
      .set({ name, description: description || null, isActive: isActive ?? true })
      .where(eq(tag.id, id));

    revalidatePath('/dashboard/tags');
    redirect('/dashboard/tags');
  },
);

export const archiveTag = run(
  { permission: PERMISSIONS.admin.tags.delete, input: tagParamsSchema },
  async (ctx, { id }) => {
    const [existing] = await ctx.db
      .select({ id: tag.id })
      .from(tag)
      .where(and(eq(tag.id, id), isNull(tag.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new AppError('not_found');
    }

    await ctx.db.update(tag).set({ deletedAt: new Date() }).where(eq(tag.id, id));

    revalidatePath('/dashboard/tags');
    redirect('/dashboard/tags');
  },
);
