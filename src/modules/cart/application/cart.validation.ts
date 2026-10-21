import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import { MAX_ID_LENGTH } from '@/shared/constants/validation';
import { MAX_QUANTITY, openFieldValuesSchema } from '@/shared/pricing/selection';

/** Cap for a single "add" payload (a product plus its complements). */
export const MAX_ADD_LINES = 21;
/** Cap for the whole cart, to keep reads and totals bounded. */
export const MAX_CART_LINES = 100;

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

export const addCartLinesSchema = z.object({
  lines: z.array(cartLineSchema).min(1).max(MAX_ADD_LINES),
});

export const updateCartItemSchema = z.object({
  itemId: z.string().trim().min(1, FIELD_ERRORS.required).max(MAX_ID_LENGTH),
  quantity: z
    .number({ error: FIELD_ERRORS.quantity })
    .int(FIELD_ERRORS.quantity)
    .min(1, FIELD_ERRORS.quantity)
    .max(MAX_QUANTITY, FIELD_ERRORS.quantity),
});

export const removeCartItemSchema = z.object({
  itemId: z.string().trim().min(1, FIELD_ERRORS.required).max(MAX_ID_LENGTH),
});

export type CartLineSchema = z.infer<typeof cartLineSchema>;
export type AddCartLinesSchema = z.infer<typeof addCartLinesSchema>;
export type UpdateCartItemSchema = z.infer<typeof updateCartItemSchema>;
export type RemoveCartItemSchema = z.infer<typeof removeCartItemSchema>;
