import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';

export const priceListParamsSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
});

const priceListFieldsSchema = {
  name: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.name),
  description: z.string().trim().max(500, FIELD_ERRORS.description).nullable().optional(),
  isDefault: z.boolean().optional(),
};

export const priceListFormSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required).optional(),
  ...priceListFieldsSchema,
});

export const createPriceListSchema = z.object(priceListFieldsSchema);

export const updatePriceListSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  ...priceListFieldsSchema,
});

export type PriceListFormSchema = z.infer<typeof priceListFormSchema>;
export type CreatePriceListSchema = z.infer<typeof createPriceListSchema>;
export type UpdatePriceListSchema = z.infer<typeof updatePriceListSchema>;
