import type { DbLike } from '@/infrastructure/db/types';
import type { FileLocator } from '@/infrastructure/services/files';
import { listOwnerFiles, syncFiles } from '@/infrastructure/services/files';
import { isTempKey } from '@/infrastructure/storage/keys';
import { AppError } from '@/shared/errors';

export const PRODUCT_IMAGE_FILES = { entity: 'product_images', scope: 'image' } as const;
export const PRODUCT_DOCUMENT_FILES = { entity: 'product_documents', scope: 'document' } as const;

export async function syncProductFile(
  db: DbLike,
  locator: FileLocator,
  ref: string | null | undefined,
  actorId: string,
): Promise<void> {
  if (!ref) {
    await syncFiles(db, locator, [], actorId);
    return;
  }

  if (!isTempKey(ref)) {
    const current = await listOwnerFiles(db, locator);
    if (!current.some((file) => file.url === ref)) {
      throw new AppError('invalid_input', 'Uno de los archivos adjuntos no es válido');
    }
  }

  await syncFiles(db, locator, [ref], actorId);

  const attached = await listOwnerFiles(db, locator);
  if (attached.length === 0) {
    throw new AppError(
      'invalid_input',
      'Uno de los archivos adjuntos ya no está disponible. Súbelo de nuevo.',
    );
  }
}

export async function detachProductFiles(
  db: DbLike,
  locator: FileLocator,
  actorId: string,
): Promise<void> {
  await syncFiles(db, locator, [], actorId);
}
