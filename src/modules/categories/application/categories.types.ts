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

export interface HomeCategoryDTO {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

export interface HomeRootCategoryDTO {
  id: string;
  name: string;
  slug: string;
  children: HomeCategoryDTO[];
}
