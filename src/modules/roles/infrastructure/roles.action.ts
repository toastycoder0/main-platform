'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { role } from '@/infrastructure/db/schema';
import { run } from '@/infrastructure/services/next-action';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import { updateRoleSchema } from '../application/roles.validation';

export const updateRole = run(
  { permission: PERMISSIONS.admin.roles.edit, input: updateRoleSchema },
  async (ctx, { id, name, description }) => {
    const [updated] = await ctx.db
      .update(role)
      .set({ name, description: description || null })
      .where(eq(role.id, id))
      .returning({ id: role.id });

    if (!updated) {
      throw new AppError('not_found');
    }

    redirect('/dashboard/roles');
  },
);
