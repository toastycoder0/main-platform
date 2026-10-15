export interface BrandListItemDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface BrandFormDTO {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface HomeBrandDTO {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
}
