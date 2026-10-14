import { slugify } from '@/shared/utils/slug';

export function slugifyProductUnitName(name: string): string {
  return slugify(name);
}
