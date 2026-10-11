import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';

export const brandParamsSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
});

const brandFieldsSchema = {
  name: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.name),
  description: z.string().trim().max(500, FIELD_ERRORS.description).nullable().optional(),
  isActive: z.boolean().optional(),
};

export const brandFormSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required).optional(),
  ...brandFieldsSchema,
});

export const createBrandSchema = z.object(brandFieldsSchema);

export const updateBrandSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  ...brandFieldsSchema,
});

export type BrandFormSchema = z.infer<typeof brandFormSchema>;
export type CreateBrandSchema = z.infer<typeof createBrandSchema>;
export type UpdateBrandSchema = z.infer<typeof updateBrandSchema>;
