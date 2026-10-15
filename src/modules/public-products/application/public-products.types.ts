export interface PublicProductPriceDTO {
  amount: number;
  currency: string;
  label: 'fixed' | 'starts_at' | 'variable';
}

export interface PublicProductDTO {
  slug: string;
  title: string;
  imageUrl: string | null;
  brand: { name: string; logoUrl: string | null } | null;
  price: PublicProductPriceDTO | null;
  unit: string | null;
}

export interface PublicProductsResult {
  items: PublicProductDTO[];
  total: number;
}

export type PublicProductSort = 'popular' | 'recent' | 'price-asc' | 'price-desc';

export interface PublicProductFilters {
  categoryIds: string[] | null;
  q: string | null;
  brands: string[];
  tags: string[];
  units: string[];
  minPrice: number | null;
  maxPrice: number | null;
  sort: PublicProductSort;
  page: number;
  pageSize: number;
}

export interface PublicFilterOption {
  slug: string;
  name: string;
}

export interface PublicProductFilterOptions {
  brands: PublicFilterOption[];
  tags: PublicFilterOption[];
  units: PublicFilterOption[];
}

export interface PublicCategoryRow {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  sortOrder: number;
}

export interface PublicCategoryNode {
  id: string;
  name: string;
  href: string;
  children: PublicCategoryNode[];
}

export interface PublicCategoryCrumb {
  name: string;
  href: string;
}
