import { z } from 'zod';

export const MAX_CATEGORY_DEPTH = 10;

export const productsRouteParamsSchema = z.object({
  cat: z.array(z.string().min(1).max(200)).max(MAX_CATEGORY_DEPTH).optional(),
});
