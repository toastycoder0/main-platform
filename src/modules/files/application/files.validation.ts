import { z } from 'zod';
import { FIELD_ERRORS } from '@/shared/constants/error-messages';
import { FILE_REGISTRY, type FileTypeSlug } from '@/shared/constants/file-registry';

const fileTypeSlugs = Object.keys(FILE_REGISTRY) as [FileTypeSlug, ...FileTypeSlug[]];

export const requestUploadSchema = z.object({
  fileType: z.enum(fileTypeSlugs, { message: 'El tipo de archivo no es válido' }),
  fileName: z.string().min(1, FIELD_ERRORS.required),
  contentType: z.string().min(1, FIELD_ERRORS.required),
  size: z.number().int().positive('El tamaño debe ser un número positivo'),
});

export const confirmUploadSchema = z.object({
  fileKey: z.string().min(1, FIELD_ERRORS.required),
  fileType: z.enum(fileTypeSlugs, { message: 'El tipo de archivo no es válido' }),
});

export const deleteTempUploadSchema = z.object({
  fileKey: z.string().min(1, FIELD_ERRORS.required),
});

export type RequestUploadSchema = z.infer<typeof requestUploadSchema>;
export type ConfirmUploadSchema = z.infer<typeof confirmUploadSchema>;
export type DeleteTempUploadSchema = z.infer<typeof deleteTempUploadSchema>;
