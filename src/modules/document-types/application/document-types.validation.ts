import { z } from 'zod';

import { FIELD_ERRORS } from '@/shared/constants/error-messages';

export const documentTypeParamsSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
});

const documentTypeFieldsSchema = {
  name: z.string().trim().min(1, FIELD_ERRORS.name).max(100, FIELD_ERRORS.name),
  description: z.string().trim().max(500, FIELD_ERRORS.description).nullable().optional(),
  isActive: z.boolean().optional(),
};

export const documentTypeFormSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required).optional(),
  ...documentTypeFieldsSchema,
});

export const createDocumentTypeSchema = z.object(documentTypeFieldsSchema);

export const updateDocumentTypeSchema = z.object({
  id: z.string().min(1, FIELD_ERRORS.required),
  ...documentTypeFieldsSchema,
});

export type DocumentTypeFormSchema = z.infer<typeof documentTypeFormSchema>;
export type CreateDocumentTypeSchema = z.infer<typeof createDocumentTypeSchema>;
export type UpdateDocumentTypeSchema = z.infer<typeof updateDocumentTypeSchema>;
