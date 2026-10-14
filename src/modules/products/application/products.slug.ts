import { slugify } from '@/shared/utils/slug';

export function slugifyProductTitle(title: string): string {
  return slugify(title);
}
