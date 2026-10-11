import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';

export const tagParamsSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
});

const tagFieldsSchema = {
  name: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.name),
  description: z.string().trim().max(500, FIELD_ERRORS.description).nullable().optional(),
  isActive: z.boolean().optional(),
};

export const tagFormSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required).optional(),
  ...tagFieldsSchema,
});

export const createTagSchema = z.object(tagFieldsSchema);

export const updateTagSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  ...tagFieldsSchema,
});

export type TagFormSchema = z.infer<typeof tagFormSchema>;
export type CreateTagSchema = z.infer<typeof createTagSchema>;
export type UpdateTagSchema = z.infer<typeof updateTagSchema>;
