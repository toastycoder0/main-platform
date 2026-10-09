import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@/infrastructure/context/types';
import { db } from '@/infrastructure/db';
import { file } from '@/infrastructure/db/schema';
import { deleteTempUpload, requestUploadUrl } from './files.action';

const state = vi.hoisted(() => ({ ctx: undefined as RequestContext | undefined }));

vi.mock('@/infrastructure/context/next-factory', () => ({
  createRequestContext: () => {
    if (!state.ctx) {
      throw new Error('Test context not set');
    }
    return state.ctx;
  },
}));

vi.mock('@/infrastructure/storage/client', () => ({
  storageClient: {
    getPresignedUploadUrl: vi.fn(() => Promise.resolve('https://upload.test/put')),
    fileExists: vi.fn(() => Promise.resolve(true)),
    deleteFile: vi.fn(() => Promise.resolve()),
    deleteFiles: vi.fn(() => Promise.resolve()),
    copyFile: vi.fn(() => Promise.resolve()),
    getPublicUrl: (key: string) => `https://cdn.test/${key}`,
  },
}));

const createdTempKeys: string[] = [];

function testContext(userId = 'user_files_action'): RequestContext {
  const logger: RequestContext['logger'] = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => logger,
  };

  // No permissions on purpose: a regular authenticated user must be able to
  // request an upload without any admin permission.
  return {
    db,
    session: {
      user: {
        id: userId,
        email: 'files@action.test',
        firstName: 'Files',
        lastName: 'Action',
        name: 'Files Action',
      },
      session: { id: 'sess_files_action', expiresAt: new Date(Date.now() + 3_600_000) },
    },
    permissions: new Set<string>(),
    logger,
    requestId: 'itest',
  };
}

beforeEach(() => {
  state.ctx = testContext();
});

afterAll(async () => {
  if (createdTempKeys.length > 0) {
    await db.delete(file).where(inArray(file.tempKey, createdTempKeys));
  }
});

function requestPdf() {
  return requestUploadUrl({
    entity: 'user',
    scope: 'taxDocument',
    fileName: 'RFC.pdf',
    contentType: 'application/pdf',
    size: 1024,
  });
}

describe('requestUploadUrl', () => {
  it('allows an authenticated user without admin permissions', async () => {
    const result = await requestPdf();

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    createdTempKeys.push(result.data.tempKey);
    expect(result.data.tempKey).toMatch(/^_temp\/[0-9a-f-]+\.pdf$/);

    const rows = await db.select().from(file).where(eq(file.tempKey, result.data.tempKey));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.ownerId).toBeNull();
    expect(rows[0]?.createdBy).toBe('user_files_action');
  });

  it('rejects a disallowed content type', async () => {
    const result = await requestUploadUrl({
      entity: 'user',
      scope: 'taxDocument',
      fileName: 'photo.png',
      contentType: 'image/png',
      size: 1024,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a file over the size limit', async () => {
    const result = await requestUploadUrl({
      entity: 'user',
      scope: 'taxDocument',
      fileName: 'big.pdf',
      contentType: 'application/pdf',
      size: 50 * 1024 * 1024,
    });

    expect(result.success).toBe(false);
  });
});

describe('deleteTempUpload', () => {
  it('removes the pending row', async () => {
    const requested = await requestPdf();

    if (!requested.success) {
      throw new Error('Expected the upload request to succeed');
    }

    const tempKey = requested.data.tempKey;
    createdTempKeys.push(tempKey);

    const removed = await deleteTempUpload({ fileKey: tempKey });
    expect(removed.success).toBe(true);

    const rows = await db.select().from(file).where(eq(file.tempKey, tempKey));
    expect(rows).toHaveLength(0);
  });

  it('does not remove a pending row created by another user', async () => {
    const requested = await requestPdf();

    if (!requested.success) {
      throw new Error('Expected the upload request to succeed');
    }

    const tempKey = requested.data.tempKey;
    createdTempKeys.push(tempKey);

    state.ctx = testContext('user_someone_else');

    const removed = await deleteTempUpload({ fileKey: tempKey });
    expect(removed.success).toBe(true);

    const rows = await db.select().from(file).where(eq(file.tempKey, tempKey));
    expect(rows).toHaveLength(1);
  });
});
