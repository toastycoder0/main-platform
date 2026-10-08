'use server';

import { eq } from 'drizzle-orm';
import { file } from '@/infrastructure/db/schema';
import { run } from '@/infrastructure/services/next-action';
import { storageClient } from '@/infrastructure/storage/client';
import { extractExtension, generateTempKey } from '@/infrastructure/storage/keys';
import { getScopeConfig } from '@/shared/constants/file-registry';
import { AppError } from '@/shared/errors';
import type { FileUploadResponse } from '../application/files.types';
import {
  confirmUploadSchema,
  deleteTempUploadSchema,
  requestUploadSchema,
} from '../application/files.validation';

export const requestUploadUrl = run({ input: requestUploadSchema }, async (ctx, data) => {
  const config = getScopeConfig(data.entity, data.scope);

  if (!config) {
    throw new AppError('invalid_input', 'El tipo de archivo no es válido');
  }

  if (data.size > config.maxSize) {
    throw new AppError(
      'invalid_input',
      `El archivo excede el tamaño máximo de ${config.maxSize / 1024 / 1024}MB`,
    );
  }

  if (config.allowedTypes.length > 0 && !config.allowedTypes.includes(data.contentType)) {
    throw new AppError('invalid_input', 'El tipo de archivo no está permitido');
  }

  const tempKey = generateTempKey(extractExtension(data.fileName));
  const uploadUrl = await storageClient.getPresignedUploadUrl(tempKey, data.contentType);

  await ctx.db.insert(file).values({
    tempKey,
    entity: data.entity,
    scope: data.scope,
    ownerId: null,
  });

  return { uploadUrl, tempKey } satisfies FileUploadResponse;
});

export const confirmUpload = run({ input: confirmUploadSchema }, async (_ctx, data) => {
  const exists = await storageClient.fileExists(data.fileKey);

  if (!exists) {
    throw new AppError('invalid_input', 'El archivo no se encontró en el almacenamiento');
  }
});

export const deleteTempUpload = run({ input: deleteTempUploadSchema }, async (ctx, data) => {
  await storageClient.deleteFile(data.fileKey);
  await ctx.db.delete(file).where(eq(file.tempKey, data.fileKey));
});
