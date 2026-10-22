import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { DbLike } from '@/infrastructure/db';
import {
  brand,
  category,
  file,
  order,
  productDocument,
  productImage,
  user,
} from '@/infrastructure/db/schema';
import { storageClient } from '@/infrastructure/storage/client';
import { extractExtension, generateFileKey, isTempKey } from '@/infrastructure/storage/keys';
import { storageKeyToUrl, urlToStorageKey } from '@/infrastructure/storage/urls';
import {
  type FileOwnerType,
  getScopeConfig,
  type ScopeConfig,
} from '@/shared/constants/file-registry';
import { AppError } from '@/shared/errors';

export interface FileDTO {
  id: string;
  key: string;
  url: string;
  sortOrder: number;
}

export interface FileLocator {
  entity: string;
  scope: string;
  ownerId: string;
}

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
  category: async (db, ownerId) => {
    const rows = await db
      .select({ id: category.id })
      .from(category)
      .where(and(eq(category.id, ownerId), isNull(category.deletedAt)))
      .limit(1);

    return Boolean(rows[0]);
  },
  brand: async (db, ownerId) => {
    const rows = await db
      .select({ id: brand.id })
      .from(brand)
      .where(and(eq(brand.id, ownerId), isNull(brand.deletedAt)))
      .limit(1);

    return Boolean(rows[0]);
  },
  product_document: async (db, ownerId) => {
    const rows = await db
      .select({ id: productDocument.id })
      .from(productDocument)
      .where(eq(productDocument.id, ownerId))
      .limit(1);

    return Boolean(rows[0]);
  },
  order: async (db, ownerId) => {
    const rows = await db
      .select({ id: order.id })
      .from(order)
      .where(eq(order.id, ownerId))
      .limit(1);

    return Boolean(rows[0]);
  },
  product_image: async (db, ownerId) => {
    const rows = await db
      .select({ id: productImage.id })
      .from(productImage)
      .where(eq(productImage.id, ownerId))
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

export async function listFilesByOwners(
  db: DbLike,
  locator: Omit<FileLocator, 'ownerId'>,
  ownerIds: string[],
): Promise<Map<string, FileDTO[]>> {
  const grouped = new Map<string, FileDTO[]>();

  if (ownerIds.length === 0) {
    return grouped;
  }

  const rows = await db
    .select()
    .from(file)
    .where(
      and(
        eq(file.entity, locator.entity),
        eq(file.scope, locator.scope),
        inArray(file.ownerId, ownerIds),
      ),
    )
    .orderBy(asc(file.sortOrder), asc(file.id));

  for (const row of rows) {
    if (!row.key || !row.ownerId) {
      continue;
    }
    const list = grouped.get(row.ownerId) ?? [];
    list.push({
      id: row.id,
      key: row.key,
      url: storageKeyToUrl(row.key),
      sortOrder: row.sortOrder,
    });
    grouped.set(row.ownerId, list);
  }

  return grouped;
}
