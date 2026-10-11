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

export interface CategoryFormDTO {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  path: string;
  parentId: string | null;
  isActive: boolean;
}
