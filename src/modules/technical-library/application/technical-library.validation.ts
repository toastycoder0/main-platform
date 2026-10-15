import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';

export const technicalLibrarySearchSchema = z.object({
  q: z.string().max(100, FIELD_ERRORS.tooLong).nullable().optional(),
  docTypes: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  brands: z.array(z.string()).optional(),
  sort: z.enum(['title', 'updated']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).optional(),
});

export type TechnicalLibrarySearchSchema = z.infer<typeof technicalLibrarySearchSchema>;