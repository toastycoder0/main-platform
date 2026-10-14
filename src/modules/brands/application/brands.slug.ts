import { slugify } from '@/shared/utils/slug';

export function slugifyBrandName(name: string): string {
  return slugify(name);
}
