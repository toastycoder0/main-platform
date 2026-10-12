export interface PriceListItemDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: Date;
}

export interface PriceListFormDTO {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
}
