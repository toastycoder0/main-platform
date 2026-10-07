import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';

export const roleParamsSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
});

export const updateRoleSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  name: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.name),
  description: z.string().trim().max(500, FIELD_ERRORS.description).nullable().optional(),
});

export type UpdateRoleSchema = z.infer<typeof updateRoleSchema>;
