import type { DbLike } from '@/modules/files/infrastructure/files.repository';
import { syncFiles } from '@/modules/files/infrastructure/files.repository';

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
