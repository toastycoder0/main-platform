import { randomBytes } from 'node:crypto';

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function uniqueSlug(text: string): string {
  return `${slugify(text)}-${randomBytes(3).toString('hex')}`;
}
