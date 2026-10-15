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

export interface HomeProductPriceDTO {
  amount: number;
  currency: string;
  label: 'fixed' | 'starts_at' | 'variable';
}

export interface HomeProductDTO {
  slug: string;
  title: string;
  imageUrl: string | null;
  brand: { name: string; logoUrl: string | null } | null;
  price: HomeProductPriceDTO | null;
  unit: string | null;
}
