import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { db } from '@/infrastructure/db';
import { file, user } from '@/infrastructure/db/schema';
import type { StorageClient } from '@/infrastructure/storage/client';
import type { FileLocator } from '../application/files.types';
import { cleanupOrphans } from './files.cleanup.service';
import { syncFiles } from './files.repository';

vi.mock('@/infrastructure/storage/client', () => ({
  storageClient: {
    copyFile: vi.fn(() => Promise.resolve()),
    deleteFile: vi.fn(() => Promise.resolve()),
    deleteFiles: vi.fn(() => Promise.resolve()),
  },
}));

const scope = `filesrepo${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const createdFileIds: string[] = [];

let userId = '';

function locator(): FileLocator {
  return { entity: 'user', scope: 'taxDocument', ownerId: userId };
}

async function insertFile(values: Partial<typeof file.$inferInsert>): Promise<string> {
  const rows = await db
    .insert(file)
    .values({ entity: 'user', scope: 'taxDocument', ...values })
    .returning({ id: file.id });
  const row = rows.at(0);

  if (!row) {
    throw new Error('Failed to insert file row');
  }

  createdFileIds.push(row.id);
  return row.id;
}

function insertPendingFile(): Promise<string> {
  return insertFile({ tempKey: `_temp/${randomUUID()}.pdf` });
}

beforeAll(async () => {
  const rows = await db
    .insert(user)
    .values({ firstName: 'Files', lastName: 'Repo', email: `${scope}@repo.test` })
    .returning({ id: user.id });
  const row = rows.at(0);

  if (!row) {
    throw new Error('Failed to create test owner');
  }

  userId = row.id;
});

afterAll(async () => {
  if (createdFileIds.length > 0) {
    await db.delete(file).where(inArray(file.id, createdFileIds));
  }

  if (userId) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

describe('syncFiles', () => {
  it('links a pending temp file to its owner', async () => {
    const id = await insertPendingFile();
    const tempKey = (await db.select().from(file).where(eq(file.id, id)).limit(1))[0]?.tempKey;

    if (!tempKey) {
      throw new Error('Pending file lost its temp key');
    }

    await syncFiles(db, locator(), [tempKey]);

    const [row] = await db.select().from(file).where(eq(file.id, id)).limit(1);

    expect(row?.ownerId).toBe(userId);
    expect(row?.tempKey).toBeNull();
    expect(row?.key).toContain(`users/taxes/${userId}/`);
    expect(row?.sortOrder).toBe(0);
  });

  it('detaches files removed from the submitted set', async () => {
    const firstTemp = `_temp/${randomUUID()}.pdf`;
    const firstId = await insertFile({ tempKey: firstTemp });
    await syncFiles(db, locator(), [firstTemp]);

    const secondTemp = `_temp/${randomUUID()}.pdf`;
    await insertFile({ tempKey: secondTemp });
    await syncFiles(db, locator(), [secondTemp]);

    const [first] = await db.select().from(file).where(eq(file.id, firstId)).limit(1);
    const owned = await db
      .select({ id: file.id })
      .from(file)
      .where(and(eq(file.entity, 'user'), eq(file.scope, 'taxDocument'), eq(file.ownerId, userId)));

    expect(first?.ownerId).toBeNull();
    expect(owned).toHaveLength(1);
  });

  it('detaches everything when the submitted set is empty', async () => {
    await syncFiles(db, locator(), []);

    const owned = await db
      .select({ id: file.id })
      .from(file)
      .where(and(eq(file.scope, 'taxDocument'), eq(file.ownerId, userId)));

    expect(owned).toHaveLength(0);
  });
});

describe('cleanupOrphans', () => {
  it('collects only orphans older than the grace window', async () => {
    const oldKey = `users/taxes/${userId}/old.pdf`;
    const newKey = `users/taxes/${userId}/new.pdf`;
    const ownedKey = `users/taxes/${userId}/owned.pdf`;

    const rows = await db
      .insert(file)
      .values([
        {
          key: oldKey,
          entity: 'user',
          scope: 'taxDocument',
          updatedAt: new Date(Date.now() - 48 * 3_600_000),
        },
        { key: newKey, entity: 'user', scope: 'taxDocument' },
        { key: ownedKey, entity: 'user', scope: 'taxDocument', ownerId: userId },
      ])
      .returning({ id: file.id });

    for (const row of rows) {
      createdFileIds.push(row.id);
    }

    const deleteFiles = vi.fn(() => Promise.resolve());
    const storage = { deleteFiles } as unknown as StorageClient;

    const result = await cleanupOrphans(db, storage, { maxAgeMs: 24 * 3_600_000 });

    expect(result.deleted).toBeGreaterThanOrEqual(1);
    expect(deleteFiles).toHaveBeenCalledWith(expect.arrayContaining([oldKey]));

    const remaining = await db
      .select({ id: file.id })
      .from(file)
      .where(
        inArray(
          file.id,
          rows.map((row) => row.id),
        ),
      );
    const remainingIds = remaining.map((row) => row.id);

    expect(remainingIds).not.toContain(rows[0]?.id);
    expect(remainingIds).toContain(rows[1]?.id);
    expect(remainingIds).toContain(rows[2]?.id);
  });
});
