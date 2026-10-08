import { describe, expect, it, vi } from 'vitest';

const PUBLIC_URL = 'https://test.r2.dev';

vi.mock('@/config/env', () => ({
  env: { NEXT_PUBLIC_CLOUD_URL: PUBLIC_URL },
}));

describe('storage urls', () => {
  it('builds the public url from a key', async () => {
    const { storageKeyToUrl } = await import('./urls');
    expect(storageKeyToUrl('users/taxes/u/a.pdf')).toBe(`${PUBLIC_URL}/users/taxes/u/a.pdf`);
  });

  it('extracts the key from our own url', async () => {
    const { urlToStorageKey } = await import('./urls');
    expect(urlToStorageKey(`${PUBLIC_URL}/users/taxes/u/a.pdf`)).toBe('users/taxes/u/a.pdf');
  });

  it('returns null for a foreign url', async () => {
    const { urlToStorageKey } = await import('./urls');
    expect(urlToStorageKey('https://other.example.com/a.pdf')).toBeNull();
  });
});
