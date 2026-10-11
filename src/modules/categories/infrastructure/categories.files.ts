import type { DbLike } from '@/modules/files/infrastructure/files.repository';
import { syncFiles } from '@/modules/files/infrastructure/files.repository';

export async function syncCategoryImage(
  db: DbLike,
  categoryId: string,
  actorId: string,
  imageRef: string | null | undefined,
): Promise<void> {
  await syncFiles(
    db,
    { entity: 'category', scope: 'image', ownerId: categoryId },
    imageRef ? [imageRef] : [],
    actorId,
  );
}
