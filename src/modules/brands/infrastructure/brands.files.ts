import type { DbLike } from '@/infrastructure/db/types';
import { syncFiles } from '@/infrastructure/services/files';

export async function syncBrandImage(
  db: DbLike,
  brandId: string,
  actorId: string,
  imageRef: string | null | undefined,
): Promise<void> {
  await syncFiles(
    db,
    { entity: 'brand', scope: 'image', ownerId: brandId },
    imageRef ? [imageRef] : [],
    actorId,
  );
}
