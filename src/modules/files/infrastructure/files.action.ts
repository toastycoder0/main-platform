'use server';

import { run } from '@/infrastructure/services/next-action';
import { storageClient } from '@/infrastructure/storage/client';
import { extractExtension, generateFileKey, generateTempKey } from '@/infrastructure/storage/keys';
import { FILE_REGISTRY } from '@/shared/constants/file-registry';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError } from '@/shared/errors';
import type { FileUploadResponse } from '../application/files.types';
import {
  confirmUploadSchema,
  deleteTempUploadSchema,
  requestUploadSchema,
} from '../application/files.validation';

export const requestUploadUrl = run(
  { permission: PERMISSIONS.admin.files.upload, input: requestUploadSchema },
  async (_ctx, data) => {
    const ext = extractExtension(data.fileName);
    const config = FILE_REGISTRY[data.fileType];

    if (data.size > config.maxSize) {
      throw new AppError(
        'invalid_input',
        `El archivo excede el tamaño máximo de ${config.maxSize / 1024 / 1024}MB`,
      );
    }

    if (config.allowedTypes.length > 0 && !config.allowedTypes.includes(data.contentType)) {
      throw new AppError('invalid_input', 'El tipo de archivo no está permitido');
    }

    const tempKey = generateTempKey(ext);
    const finalKey = generateFileKey(config.path, ext);
    const uploadUrl = await storageClient.getPresignedUploadUrl(tempKey, data.contentType);

    return { uploadUrl, tempKey, finalKey } satisfies FileUploadResponse;
  },
);

export const confirmUpload = run(
  { permission: PERMISSIONS.admin.files.upload, input: confirmUploadSchema },
  async (_ctx, data) => {
    const exists = await storageClient.fileExists(data.fileKey);

    if (!exists) {
      throw new AppError('invalid_input', 'El archivo no se encontró en el almacenamiento');
    }
  },
);

export const deleteTempUpload = run(
  { permission: PERMISSIONS.admin.files.upload, input: deleteTempUploadSchema },
  async (_ctx, data) => {
    await storageClient.deleteFile(data.fileKey);
  },
);
