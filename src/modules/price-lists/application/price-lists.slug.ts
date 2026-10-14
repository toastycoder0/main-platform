import { slugify } from '@/shared/utils/slug';

export function slugifyPriceListName(name: string): string {
  return slugify(name);
}
