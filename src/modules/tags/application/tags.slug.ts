import { slugify } from '@/shared/utils/slug';

export function slugifyTagName(name: string): string {
  return slugify(name);
}
