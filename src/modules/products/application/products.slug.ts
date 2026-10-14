import { slugify } from '@/shared/utils/slug';

export function slugifyProductTitle(title: string) {
  return slugify(title);
}
