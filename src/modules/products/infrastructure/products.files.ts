import { isTempKey } from '@/infrastructure/storage/keys';
import type { FileLocator } from '@/modules/files/application/files.types';
import type { DbLike } from '@/modules/files/infrastructure/files.repository';
import { listOwnerFiles, syncFiles } from '@/modules/files/infrastructure/files.repository';
import { AppError } from '@/shared/errors';

export const PRODUCT_IMAGE_FILES = { entity: 'product_images', scope: 'image' } as const;
export const PRODUCT_DOCUMENT_FILES = { entity: 'product_documents', scope: 'document' } as const;

/**
 * Attaches a single file to a product image or document row. Only fresh uploads
 * (temp keys) or the file the row already owns may be claimed; any other URL
 * would let a payload steal a file from a different owner.
 */
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

  // `syncFiles` skips refs it cannot resolve (expired uploads), which would leave the row empty.
  const attached = await listOwnerFiles(db, locator);
  if (attached.length === 0) {
    throw new AppError(
      'invalid_input',
      'Uno de los archivos adjuntos ya no está disponible. Súbelo de nuevo.',
    );
  }
}

/** Releases the files of a row that is about to be deleted. */
export async function detachProductFiles(
  db: DbLike,
  locator: FileLocator,
  actorId: string,
): Promise<void> {
  await syncFiles(db, locator, [], actorId);
}
