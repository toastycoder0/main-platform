import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';

export const currencyParamsSchema = z.object({
  code: z.string().min(1, FIELD_ERRORS.required),
});

export const currencyFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, FIELD_ERRORS.required)
    .max(3, FIELD_ERRORS.tooLong)
    .transform((v) => v.toUpperCase())
    .optional(),
  name: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.name),
  decimalDigits: z.coerce.number().int().min(0).max(4),
  isActive: z.boolean().optional(),
});

export const createCurrencySchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, FIELD_ERRORS.required)
    .max(3, FIELD_ERRORS.tooLong)
    .transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.name),
  decimalDigits: z.coerce.number().int().min(0).max(4).default(2),
  isActive: z.boolean().optional(),
});

export const updateCurrencySchema = z.object({
  code: z.string().min(1, FIELD_ERRORS.required),
  name: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.name),
  decimalDigits: z.coerce.number().int().min(0).max(4).default(2),
  isActive: z.boolean().optional(),
});

export type CurrencyFormSchema = z.infer<typeof currencyFormSchema>;
export type CreateCurrencySchema = z.infer<typeof createCurrencySchema>;
export type UpdateCurrencySchema = z.infer<typeof updateCurrencySchema>;
