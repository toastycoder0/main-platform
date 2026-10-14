import type { ProductFormSchema } from './products.validation';

export interface ProductListItemDTO {
  id: string;
  slug: string;
  title: string;
  code: string | null;
  status: 'active' | 'inactive' | 'warehouse_only';
  brandName: string | null;
  unitName: string;
  createdAt: Date;
}

export interface ProductVariantOption {
  productId: string;
  value: string;
  label: string;
}

export type ProductFormDTO = ProductFormSchema & { id: string };
