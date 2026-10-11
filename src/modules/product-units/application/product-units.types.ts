export interface ProductUnitListItemDTO {
  id: string;
  slug: string;
  name: string;
  abbreviation: string | null;
  taxCode: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface ProductUnitFormDTO {
  id: string;
  name: string;
  abbreviation: string | null;
  taxCode: string | null;
  isActive: boolean;
}
