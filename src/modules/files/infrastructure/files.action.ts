'use server';

import { createRequestContext } from '@/infrastructure/context/next-factory';
import type { RequestContext } from '@/infrastructure/context/types';
import { storageClient } from '@/infrastructure/storage/client';
import { extractExtension, generateFileKey, generateTempKey } from '@/infrastructure/storage/keys';
import { FILE_REGISTRY } from '@/shared/constants/file-registry';
import { PERMISSIONS } from '@/shared/constants/permissions';
import { AppError, isAppError } from '@/shared/errors';
import { fail, ok, type Result } from '@/shared/result';
import type { FileUploadResponse } from '../application/files.types';
import {
  confirmUploadSchema,
  deleteTempUploadSchema,
  requestUploadSchema,
} from '../application/files.validation';

export async function requestUploadUrl(payload: unknown): Promise<Result<FileUploadResponse>> {
  let ctx: RequestContext | undefined;

  try {
    ctx = await createRequestContext();

    if (!ctx.session) {
      throw new AppError('unauthorized');
    }
    if (!ctx.permissions.has(PERMISSIONS.admin.files.upload)) {
      throw new AppError('forbidden');
    }

    const parsed = requestUploadSchema.safeParse(payload);
    if (!parsed.success) {
      ctx.logger.warn({ issues: parsed.error.issues }, 'requestUploadUrl validation failed');
      return fail('Datos inválidos');
    }

    const { fileType, fileName, contentType, size } = parsed.data;
    const ext = extractExtension(fileName);
    const config = FILE_REGISTRY[fileType];

    if (size > config.maxSize) {
      return fail(`El archivo excede el tamaño máximo de ${config.maxSize / 1024 / 1024}MB`);
    }

    if (config.allowedTypes.length > 0 && !config.allowedTypes.includes(contentType)) {
      return fail('El tipo de archivo no está permitido');
    }

    const tempKey = generateTempKey(ext);
    const finalKey = generateFileKey(config.path, ext);
    const uploadUrl = await storageClient.getPresignedUploadUrl(tempKey, contentType);

    return ok({ uploadUrl, tempKey, finalKey });
  } catch (error) {
    if (isAppError(error)) {
      return fail(error.message);
    }
    ctx?.logger.error({ err: error }, 'requestUploadUrl failed');
    return fail('Error al generar la URL de subida');
  }
}

export async function confirmUpload(payload: unknown): Promise<Result> {
  let ctx: RequestContext | undefined;

  try {
    ctx = await createRequestContext();

    if (!ctx.session) {
      throw new AppError('unauthorized');
    }
    if (!ctx.permissions.has(PERMISSIONS.admin.files.upload)) {
      throw new AppError('forbidden');
    }

    const parsed = confirmUploadSchema.safeParse(payload);
    if (!parsed.success) {
      ctx.logger.warn({ issues: parsed.error.issues }, 'confirmUpload validation failed');
      return fail('Datos inválidos');
    }

    const exists = await storageClient.fileExists(parsed.data.fileKey);
    if (!exists) {
      return fail('El archivo no se encontró en el almacenamiento');
    }

    return ok(undefined);
  } catch (error) {
    if (isAppError(error)) {
      return fail(error.message);
    }
    ctx?.logger.error({ err: error }, 'confirmUpload failed');
    return fail('Error al confirmar la subida');
  }
}

export async function deleteTempUpload(payload: unknown): Promise<Result> {
  let ctx: RequestContext | undefined;

  try {
    ctx = await createRequestContext();

    if (!ctx.session) {
      throw new AppError('unauthorized');
    }
    if (!ctx.permissions.has(PERMISSIONS.admin.files.upload)) {
      throw new AppError('forbidden');
    }

    const parsed = deleteTempUploadSchema.safeParse(payload);
    if (!parsed.success) {
      ctx.logger.warn({ issues: parsed.error.issues }, 'deleteTempUpload validation failed');
      return fail('Datos inválidos');
    }

    await storageClient.deleteFile(parsed.data.fileKey);
    return ok(undefined);
  } catch (error) {
    if (isAppError(error)) {
      return fail(error.message);
    }
    ctx?.logger.error({ err: error }, 'deleteTempUpload failed');
    return fail('Error al eliminar el archivo temporal');
  }
}
