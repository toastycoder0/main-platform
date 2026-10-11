import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';

export const productUnitParamsSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
});

const productUnitFieldsSchema = {
  name: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.name),
  abbreviation: z.string().trim().max(30, FIELD_ERRORS.tooLong).optional(),
  taxCode: z.string().trim().max(30, FIELD_ERRORS.tooLong).optional(),
  isActive: z.boolean().optional(),
};

export const productUnitFormSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required).optional(),
  ...productUnitFieldsSchema,
});

export const createProductUnitSchema = z.object(productUnitFieldsSchema);

export const updateProductUnitSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  ...productUnitFieldsSchema,
});

export type ProductUnitFormSchema = z.infer<typeof productUnitFormSchema>;
export type CreateProductUnitSchema = z.infer<typeof createProductUnitSchema>;
export type UpdateProductUnitSchema = z.infer<typeof updateProductUnitSchema>;
