import { describe, expect, it, vi } from 'vitest';

const PUBLIC_URL = 'https://test.r2.dev';

vi.mock('@/config/env', () => ({
  env: {
    CLOUD_ACCOUNT_ID: 'test-account',
    CLOUD_SECRET_ACCESS_KEY: 'test-secret',
    CLOUD_ACCESS_KEY_ID: 'test-key',
    CLOUD_BUCKET: 'test-bucket',
    NEXT_PUBLIC_CLOUD_URL: PUBLIC_URL,
  },
}));

const send = vi.hoisted(() => vi.fn((_command: unknown) => Promise.resolve({})));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = send;
  },
  PutObjectCommand: class {},
  HeadObjectCommand: class {},
  CopyObjectCommand: class {},
  DeleteObjectCommand: class {},
  DeleteObjectsCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(() => Promise.resolve('https://signed.test')),
}));

describe('storage client', () => {
  it('constructs public URL from key', async () => {
    const { storageClient } = await import('./client');
    expect(storageClient.getPublicUrl('users/taxes/uuid.pdf')).toBe(
      `${PUBLIC_URL}/users/taxes/uuid.pdf`,
    );
  });

  it('is a singleton', async () => {
    const mod1 = await import('./client');
    const mod2 = await import('./client');
    expect(mod1.storageClient).toBe(mod2.storageClient);
  });

  it('batches deletes into groups of 1000 keys', async () => {
    send.mockClear();
    const { storageClient } = await import('./client');
    const keys = Array.from({ length: 2500 }, (_, index) => `key-${index}`);

    await storageClient.deleteFiles(keys);

    const batchSizes = send.mock.calls.map((call) => {
      const command = call[0] as { input: { Delete: { Objects: unknown[] } } };
      return command.input.Delete.Objects.length;
    });

    expect(batchSizes).toEqual([1000, 1000, 500]);
  });
});
