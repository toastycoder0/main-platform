export interface DocumentTypeListItemDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface DocumentTypeFormDTO {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}
