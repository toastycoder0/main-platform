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

describe('storage client', () => {
  it('constructs public URL from key', async () => {
    const { storageClient } = await import('./client');
    expect(storageClient.getPublicUrl('users/taxes/uuid.pdf')).toBe(
      'https://test.r2.dev/users/taxes/uuid.pdf',
    );
  });

  it('is a singleton', async () => {
    const mod1 = await import('./client');
    const mod2 = await import('./client');
    expect(mod1.storageClient).toBe(mod2.storageClient);
  });
});
