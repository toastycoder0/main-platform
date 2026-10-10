import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';

export const categoryParamsSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
});

const categoryFieldsSchema = {
  name: z.string().trim().min(1, FIELD_ERRORS.name),
  description: z.string().trim().max(500, FIELD_ERRORS.description).nullable().optional(),
  isActive: z.boolean().optional(),
};

export const createCategorySchema = z.object({
  parentId: z.string().optional().nullable(),
  ...categoryFieldsSchema,
});

export const updateCategorySchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  ...categoryFieldsSchema,
});

export const reorderCategorySchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  direction: z.enum(['up', 'down']),
});

export const moveCategorySchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  newParentId: z.string().optional().nullable(),
});

export const toggleCategoryActiveSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  isActive: z.boolean(),
});

export type CreateCategorySchema = z.infer<typeof createCategorySchema>;
export type UpdateCategorySchema = z.infer<typeof updateCategorySchema>;
export type ReorderCategorySchema = z.infer<typeof reorderCategorySchema>;
export type MoveCategorySchema = z.infer<typeof moveCategorySchema>;
export type ToggleCategoryActiveSchema = z.infer<typeof toggleCategoryActiveSchema>;
