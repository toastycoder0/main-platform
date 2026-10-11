export interface TagListItemDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface TagFormDTO {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}
