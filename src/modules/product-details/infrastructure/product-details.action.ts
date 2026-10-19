'use server';

import { run } from '@/infrastructure/services/next-action';
import { AppError } from '@/shared/errors';
import { buildCartLine } from '../application/product-details.cart';
import type { AddToCartPreviewDTO } from '../application/product-details.types';
import { addToCartSchema } from '../application/product-details.validation';
import { findCartSources } from './product-details.cart.query';

/**
 * Validates and prices the requested lines without persisting anything: the
 * cart storage is not wired yet, so the client only surfaces the result.
 */
export const addToCart = run(
  { input: addToCartSchema },
  async (ctx, { lines }): Promise<AddToCartPreviewDTO> => {
    const sources = await findCartSources(ctx, [...new Set(lines.map((line) => line.productSlug))]);

    return {
      lines: lines.map((input) => {
        const source = sources.get(input.productSlug);

        if (!source) {
          throw new AppError('not_found', 'Uno de los productos ya no está disponible');
        }

        const result = buildCartLine(source, input);

        if (!result.ok) {
          throw new AppError('invalid_input', result.message);
        }

        return result.line;
      }),
    };
  },
);
