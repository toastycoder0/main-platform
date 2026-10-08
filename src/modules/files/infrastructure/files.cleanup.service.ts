import { and, inArray, isNull, lt } from 'drizzle-orm';
import type { DatabaseClient } from '@/infrastructure/db';
import { file } from '@/infrastructure/db/schema';
import type { StorageClient } from '@/infrastructure/storage/client';

export const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface CleanupResult {
  scanned: number;
  deleted: number;
}

/**
 * Deletes files that no longer belong to any owner and have been detached for
 * longer than the grace window. The grace window protects files that are
 * momentarily unowned during a write, and the storage objects are removed
 * before their rows so a partial failure only leaks instead of breaking a
 * still-referenced row.
 */
export async function cleanupOrphans(
  db: DatabaseClient,
  storage: StorageClient,
  options: { maxAgeMs?: number | undefined; now?: Date | undefined } = {},
): Promise<CleanupResult> {
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const cutoff = new Date((options.now ?? new Date()).getTime() - maxAgeMs);

  const rows = await db
    .select({ id: file.id, key: file.key, tempKey: file.tempKey })
    .from(file)
    .where(and(isNull(file.ownerId), lt(file.updatedAt, cutoff)));

  if (rows.length === 0) {
    return { scanned: 0, deleted: 0 };
  }

  const keys = rows
    .flatMap((row) => [row.key, row.tempKey])
    .filter((key): key is string => Boolean(key));

  if (keys.length > 0) {
    await storage.deleteFiles(keys);
  }

  await db.delete(file).where(
    inArray(
      file.id,
      rows.map((row) => row.id),
    ),
  );

  return { scanned: rows.length, deleted: rows.length };
}
