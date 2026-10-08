import type { DatabaseClient } from '@/infrastructure/db';
import { syncFiles } from '@/modules/files/infrastructure/files.repository';
import type { TaxProfileSchema } from '../application/users.validation';

type DbLike = Pick<DatabaseClient, 'select' | 'insert' | 'update' | 'delete'>;

/**
 * Syncs the RFC documents of every tax profile of a user. The user is the owner
 * of this collection because tax profile rows are replaced on each save, and the
 * profile index is preserved as the file sort order.
 */
export async function syncTaxProfileFiles(
  db: DbLike,
  userId: string,
  taxProfiles: TaxProfileSchema[],
): Promise<void> {
  await syncFiles(
    db,
    { entity: 'user', scope: 'taxDocument', ownerId: userId },
    taxProfiles.map((profile) => profile.rfcUrl),
  );
}
