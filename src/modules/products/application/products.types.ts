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
