import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';

export const productDetailRouteParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, FIELD_ERRORS.required)
    .max(200)
    .regex(/^[a-z0-9-]+$/),
});
