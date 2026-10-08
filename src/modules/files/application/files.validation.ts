import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import { FILE_REGISTRY, type FileEntity } from '@/shared/constants/file-registry';

const entitySlugs = Object.keys(FILE_REGISTRY) as [FileEntity, ...FileEntity[]];

export const requestUploadSchema = z.object({
  entity: z.enum(entitySlugs, { message: 'La entidad no es válida' }),
  scope: z.string().min(1, FIELD_ERRORS.required),
  fileName: z.string().min(1, FIELD_ERRORS.required),
  contentType: z.string().min(1, FIELD_ERRORS.required),
  size: z.number().int().positive('El tamaño debe ser un número positivo'),
});

export const confirmUploadSchema = z.object({
  fileKey: z.string().min(1, FIELD_ERRORS.required),
});

export const deleteTempUploadSchema = z.object({
  fileKey: z.string().min(1, FIELD_ERRORS.required),
});

export const cleanupQuerySchema = z.object({
  maxAgeHours: z.coerce.number().int().positive().max(720).optional(),
});

export type RequestUploadSchema = z.infer<typeof requestUploadSchema>;
export type ConfirmUploadSchema = z.infer<typeof confirmUploadSchema>;
export type DeleteTempUploadSchema = z.infer<typeof deleteTempUploadSchema>;
export type CleanupQuerySchema = z.infer<typeof cleanupQuerySchema>;
