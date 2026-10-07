import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';

export const roleParamsSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
});

const roleFieldsSchema = {
  name: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.name),
  description: z.string().trim().max(500, FIELD_ERRORS.description).nullable().optional(),
  permissionIds: z.array(z.string().min(1, FIELD_ERRORS.required)).min(1, FIELD_ERRORS.permissions),
};

export const roleFormSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required).optional(),
  ...roleFieldsSchema,
});

export const createRoleSchema = z.object(roleFieldsSchema);

export const updateRoleSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  ...roleFieldsSchema,
});

export type RoleFormSchema = z.infer<typeof roleFormSchema>;
export type CreateRoleSchema = z.infer<typeof createRoleSchema>;
export type UpdateRoleSchema = z.infer<typeof updateRoleSchema>;
