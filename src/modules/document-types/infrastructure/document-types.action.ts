'use server';

import { and, eq, isNull, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { documentType } from '@/infrastructure/db/schema';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import { uniqueSlug } from '@/shared/utils/slug';
import {
  createDocumentTypeSchema,
  documentTypeParamsSchema,
  updateDocumentTypeSchema,
} from '../application/document-types.validation';

export const createDocumentType = run(
  { permission: PERMISSIONS.admin.documentTypes.create, input: createDocumentTypeSchema },
  async (ctx, { name, description, isActive }) => {
    const slug = uniqueSlug(name);

    await ctx.db.transaction(async (tx) => {
      const [row] = await tx
        .select({ value: sql<number>`coalesce(max(${documentType.sortOrder}), -1)` })
        .from(documentType);

      await tx.insert(documentType).values({
        slug,
        name,
        description: description || null,
        isActive: isActive ?? true,
        sortOrder: (row?.value ?? -1) + 1,
      });
    });

    revalidatePath('/dashboard/document-types');
    redirect('/dashboard/document-types');
  },
);

export const updateDocumentType = run(
  { permission: PERMISSIONS.admin.documentTypes.edit, input: updateDocumentTypeSchema },
  async (ctx, { id, name, description, isActive }) => {
    const [existing] = await ctx.db
      .select({ id: documentType.id })
      .from(documentType)
      .where(and(eq(documentType.id, id), isNull(documentType.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new AppError('not_found');
    }

    await ctx.db
      .update(documentType)
      .set({ name, description: description || null, isActive: isActive ?? true })
      .where(eq(documentType.id, id));

    revalidatePath('/dashboard/document-types');
    redirect('/dashboard/document-types');
  },
);

export const archiveDocumentType = run(
  { permission: PERMISSIONS.admin.documentTypes.delete, input: documentTypeParamsSchema },
  async (ctx, { id }) => {
    const [existing] = await ctx.db
      .select({ id: documentType.id })
      .from(documentType)
      .where(and(eq(documentType.id, id), isNull(documentType.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new AppError('not_found');
    }

    await ctx.db.update(documentType).set({ deletedAt: new Date() }).where(eq(documentType.id, id));

    revalidatePath('/dashboard/document-types');
    redirect('/dashboard/document-types');
  },
);
