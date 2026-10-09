import { and, asc, eq, isNull } from 'drizzle-orm';
import type { DatabaseClient } from '@/infrastructure/db';
import { file, user } from '@/infrastructure/db/schema';
import { storageClient } from '@/infrastructure/storage/client';
import { extractExtension, generateFileKey, isTempKey } from '@/infrastructure/storage/keys';
import { storageKeyToUrl, urlToStorageKey } from '@/infrastructure/storage/urls';
import {
  type FileOwnerType,
  getScopeConfig,
  type ScopeConfig,
} from '@/shared/constants/file-registry';
import { AppError } from '@/shared/errors';
import type { FileDTO, FileLocator } from '../application/files.types';

export type DbLike = Pick<DatabaseClient, 'select' | 'insert' | 'update' | 'delete'>;

type FileRow = typeof file.$inferSelect;

type OwnerChecker = (db: DbLike, ownerId: string) => Promise<boolean>;

const OWNER_CHECKERS: Partial<Record<FileOwnerType, OwnerChecker>> = {
  user: async (db, ownerId) => {
    const rows = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.id, ownerId), isNull(user.deletedAt)))
      .limit(1);

    return Boolean(rows[0]);
  },
};

async function assertOwnerExists(
  db: DbLike,
  ownerType: FileOwnerType,
  ownerId: string,
): Promise<void> {
  const checker = OWNER_CHECKERS[ownerType];

  if (!checker) {
    throw new AppError('internal', 'El tipo de dueño no está soportado');
  }

  if (!(await checker(db, ownerId))) {
    throw new AppError('invalid_input', 'El dueño del archivo no existe');
  }
}

async function resolveRef(db: DbLike, ref: string): Promise<FileRow | undefined> {
  if (isTempKey(ref)) {
    const rows = await db.select().from(file).where(eq(file.tempKey, ref)).limit(1);
    return rows[0];
  }

  const key = urlToStorageKey(ref);

  if (!key) {
    return undefined;
  }

  const rows = await db.select().from(file).where(eq(file.key, key)).limit(1);
  return rows[0];
}

async function attachRef(
  db: DbLike,
  config: ScopeConfig,
  locator: FileLocator,
  ref: string,
  index: number,
  actorId: string,
): Promise<void> {
  const row = await resolveRef(db, ref);

  if (!row) {
    return;
  }

  // A pending upload can only be claimed by the user who requested it.
  if (isTempKey(ref) && row.createdBy !== actorId) {
    throw new AppError('forbidden', 'El archivo no pertenece al usuario');
  }

  let finalKey = row.key;

  if (isTempKey(ref)) {
    finalKey = generateFileKey(`${config.path}/${locator.ownerId}`, extractExtension(ref));
    await storageClient.copyFile(ref, finalKey);
    await storageClient.deleteFile(ref);
  }

  await db
    .update(file)
    .set({
      entity: locator.entity,
      scope: locator.scope,
      ownerId: locator.ownerId,
      sortOrder: index,
      key: finalKey,
      tempKey: null,
    })
    .where(eq(file.id, row.id));
}

/**
 * Replaces the complete file set of a locator: detaches everything currently
 * owned by (entity, scope, ownerId), then re-attaches the submitted refs in
 * order. Detached files keep their object but lose their owner, which makes
 * them eligible for garbage collection. Refs are positional: index `i` becomes
 * the `sortOrder`, so callers must submit the full collection including gaps.
 */
export async function syncFiles(
  db: DbLike,
  locator: FileLocator,
  refs: string[],
  actorId: string,
): Promise<void> {
  const config = getScopeConfig(locator.entity, locator.scope);

  if (!config) {
    throw new AppError('invalid_input', 'El tipo de archivo no es válido');
  }

  if (refs.filter((ref) => ref !== '').length > config.maxCount) {
    throw new AppError('invalid_input', `No se permiten más de ${config.maxCount} archivos`);
  }

  await assertOwnerExists(db, config.ownerType, locator.ownerId);

  await db
    .update(file)
    .set({ ownerId: null })
    .where(
      and(
        eq(file.entity, locator.entity),
        eq(file.scope, locator.scope),
        eq(file.ownerId, locator.ownerId),
      ),
    );

  for (let index = 0; index < refs.length; index++) {
    const ref = refs[index];

    if (ref) {
      await attachRef(db, config, locator, ref, index, actorId);
    }
  }
}

export async function listOwnerFiles(db: DbLike, locator: FileLocator): Promise<FileDTO[]> {
  const rows = await db
    .select()
    .from(file)
    .where(
      and(
        eq(file.entity, locator.entity),
        eq(file.scope, locator.scope),
        eq(file.ownerId, locator.ownerId),
      ),
    )
    .orderBy(asc(file.sortOrder), asc(file.id));

  return rows.flatMap((row) =>
    row.key
      ? [{ id: row.id, key: row.key, url: storageKeyToUrl(row.key), sortOrder: row.sortOrder }]
      : [],
  );
}
