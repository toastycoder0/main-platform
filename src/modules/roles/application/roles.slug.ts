import { slugify } from '@/shared/utils/slug';

export function slugifyRoleName(name: string): string {
  return slugify(name);
}
