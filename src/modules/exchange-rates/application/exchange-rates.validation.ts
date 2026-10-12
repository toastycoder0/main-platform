import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';

export const exchangeRateParamsSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
});

export const exchangeRateFormSchema = z.object({
  id: z.string().optional(),
  baseCode: z.string().min(1, FIELD_ERRORS.required).max(3),
  quoteCode: z.string().min(1, FIELD_ERRORS.required).max(3),
  rate: z.coerce.number().positive('La tasa debe ser un número positivo'),
  fetchedAt: z.string().min(1, FIELD_ERRORS.required),
});

export const createExchangeRateSchema = z.object({
  baseCode: z.string().min(1, FIELD_ERRORS.required).max(3),
  quoteCode: z
    .string()
    .min(1, FIELD_ERRORS.required)
    .max(3)
    .transform((v) => v.toUpperCase()),
  rate: z.coerce.number().positive('La tasa debe ser un número positivo'),
  fetchedAt: z.date({ message: FIELD_ERRORS.required }),
});

export const updateExchangeRateSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  baseCode: z.string().min(1, FIELD_ERRORS.required).max(3),
  quoteCode: z
    .string()
    .min(1, FIELD_ERRORS.required)
    .max(3)
    .transform((v) => v.toUpperCase()),
  rate: z.coerce.number().positive('La tasa debe ser un número positivo'),
  fetchedAt: z.date({ message: FIELD_ERRORS.required }),
});

export type ExchangeRateFormSchema = z.infer<typeof exchangeRateFormSchema>;
export type CreateExchangeRateSchema = z.infer<typeof createExchangeRateSchema>;
export type UpdateExchangeRateSchema = z.infer<typeof updateExchangeRateSchema>;
