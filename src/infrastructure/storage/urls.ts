import { env } from '@/config/env';

// Centralized conversion between a storage key and its public URL so modules do
// not repeat the bucket prefix handling.
export function storageKeyToUrl(key: string): string {
  return `${env.NEXT_PUBLIC_CLOUD_URL}/${key}`;
}

export function urlToStorageKey(url: string): string | null {
  const base = `${env.NEXT_PUBLIC_CLOUD_URL}/`;
  return url.startsWith(base) ? url.slice(base.length) : null;
}
