'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { run } from '@/infrastructure/services/next-action';
import { AppError } from '@/shared/errors';
import { buildCartLine } from '../application/cart.line';
import type { AddToCartPreviewDTO } from '../application/cart.types';
import {
  addCartLinesSchema,
  removeCartItemSchema,
  updateCartItemSchema,
} from '../application/cart.validation';
import {
  addCartLines as persistCartLines,
  clearCart as persistClearCart,
  removeCartItem as persistRemoveCartItem,
  updateCartItemQuantity,
} from './cart.repository';
import { findCartSources } from './cart.sources.query';

function revalidateCart(): void {
  revalidatePath('/cart');
  // The cart badge lives in the public layout.
  revalidatePath('/', 'layout');
}

/** Validates and prices the requested lines from trusted data, then stores them. */
export const addToCart = run(
  { input: addCartLinesSchema },
  async (ctx, { lines }): Promise<AddToCartPreviewDTO> => {
    const sources = await findCartSources(ctx, [...new Set(lines.map((line) => line.productSlug))]);

    const resolved = lines.map((input) => {
      const source = sources.get(input.productSlug);

      if (!source) {
        throw new AppError('not_found', 'Uno de los productos ya no está disponible');
      }

      const result = buildCartLine(source, input);

      if (!result.ok) {
        throw new AppError('invalid_input', result.message);
      }

      return result.line;
    });

    await persistCartLines(ctx, resolved);
    revalidateCart();

    return { lines: resolved.map((line) => line.line) };
  },
);

export const updateCartItem = run(
  { input: updateCartItemSchema },
  async (ctx, { itemId, quantity }) => {
    await updateCartItemQuantity(ctx, itemId, quantity);
    revalidateCart();
  },
);

export const removeCartItem = run({ input: removeCartItemSchema }, async (ctx, { itemId }) => {
  await persistRemoveCartItem(ctx, itemId);
  revalidateCart();
});

export const clearCart = run({ input: z.undefined() }, async (ctx) => {
  await persistClearCart(ctx);
  revalidateCart();
});
