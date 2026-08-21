import { z } from 'zod';
import { FIELD_ERRORS } from '@/lib/constants/errors';

export const loginSchema = z.object({
  email: z.email(FIELD_ERRORS.email).min(1, FIELD_ERRORS.required),
  password: z.string().min(8, FIELD_ERRORS.password),
});

export type LoginSchema = z.infer<typeof loginSchema>;
