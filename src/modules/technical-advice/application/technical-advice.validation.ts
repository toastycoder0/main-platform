import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';

const phone = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d{10}$/.test(value), FIELD_ERRORS.phone);

export const technicalAdviceFormSchema = z.object({
  firstName: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.tooLong),
  lastName: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.tooLong),
  phone,
  email: z.email(FIELD_ERRORS.email).min(1, FIELD_ERRORS.required),
  message: z.string().trim().min(1, FIELD_ERRORS.required).max(500, FIELD_ERRORS.tooLong),
});

export type TechnicalAdviceFormSchema = z.infer<typeof technicalAdviceFormSchema>;
