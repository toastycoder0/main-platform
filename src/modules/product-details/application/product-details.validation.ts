import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import { MAX_LONG_TEXT, MAX_QUANTITY } from '@/shared/pricing/selection';

export const MAX_CART_LINES = 21;
export const MAX_ID_LENGTH = 100;
export const OPEN_FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{0,49}$/;

export const productDetailRouteParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, FIELD_ERRORS.required)
    .max(200)
    .regex(/^[a-z0-9-]+$/),
});

export const openFieldValuesSchema = z.record(
  z.string().regex(OPEN_FIELD_KEY_PATTERN),
  z.string().max(MAX_LONG_TEXT, FIELD_ERRORS.tooLong),
);

export const cartLineSchema = z.object({
  productSlug: z.string().trim().min(1, FIELD_ERRORS.required).max(200),
  variantId: z.string().trim().min(1, FIELD_ERRORS.required).max(MAX_ID_LENGTH),
  quantity: z
    .number({ error: FIELD_ERRORS.quantity })
    .int(FIELD_ERRORS.quantity)
    .min(1, FIELD_ERRORS.quantity)
    .max(MAX_QUANTITY, FIELD_ERRORS.quantity),
  fields: openFieldValuesSchema,
});

export const addToCartSchema = z.object({
  lines: z.array(cartLineSchema).min(1).max(MAX_CART_LINES),
});

export type CartLineSchema = z.infer<typeof cartLineSchema>;
export type AddToCartSchema = z.infer<typeof addToCartSchema>;
