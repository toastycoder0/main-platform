import { slugify } from '@/shared/utils/slug';

export function slugifyDocumentTypeName(name: string): string {
  return slugify(name);
}
