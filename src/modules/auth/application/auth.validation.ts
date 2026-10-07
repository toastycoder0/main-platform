import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';

export const loginSchema = z.object({
  email: z.email(FIELD_ERRORS.email).min(1, FIELD_ERRORS.required),
  password: z.string().min(8, FIELD_ERRORS.password),
});

export const forgotPasswordSchema = z.object({
  email: z.email(FIELD_ERRORS.email).min(1, FIELD_ERRORS.required),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, FIELD_ERRORS.required),
  newPassword: z.string().min(8, FIELD_ERRORS.password).max(128, FIELD_ERRORS.tooLong),
});

export const resetPasswordPageSchema = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
