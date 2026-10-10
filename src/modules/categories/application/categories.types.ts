export interface CategoryTreeRow {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  description: string | null;
  path: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
