import type { DbLike } from '@/infrastructure/db/types';
import { syncFiles } from '@/infrastructure/services/files';

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
