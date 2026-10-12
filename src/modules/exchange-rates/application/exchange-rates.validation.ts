import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';

export const exchangeRateParamsSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
});

export const exchangeRateFieldsSchema = {
  baseCode: z.string().min(1, FIELD_ERRORS.required).max(3),
  quoteCode: z
    .string()
    .min(1, FIELD_ERRORS.required)
    .max(3)
    .transform((v) => v.toUpperCase()),
  rate: z.coerce.number().positive('La tasa debe ser un número positivo'),
  fetchedAt: z
    .date({ required_error: FIELD_ERRORS.required })
    .or(z.string().transform((v) => new Date(v))),
};

export const exchangeRateFormSchema = z.object({
  id: z.string().optional(),
  ...exchangeRateFieldsSchema,
});

export const createExchangeRateSchema = z.object(exchangeRateFieldsSchema);

export const updateExchangeRateSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  ...exchangeRateFieldsSchema,
});

export type ExchangeRateFormSchema = z.infer<typeof exchangeRateFormSchema>;
export type CreateExchangeRateSchema = z.infer<typeof createExchangeRateSchema>;
export type UpdateExchangeRateSchema = z.infer<typeof updateExchangeRateSchema>;
