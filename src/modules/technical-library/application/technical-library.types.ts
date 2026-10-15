export interface TechnicalLibraryDocumentDTO {
  documentId: string;
  label: string;
  documentTypeName: string | null;
  fileUrl: string;
  fileFormat: string | null;
}

export interface TechnicalLibraryItemDTO {
  productId: string;
  productTitle: string;
  productSlug: string;
  productCode: string | null;
  brandName: string | null;
  imageUrl: string | null;
  productCategoryName: string | null;
  documents: TechnicalLibraryDocumentDTO[];
}

export interface LibraryFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface LibraryFilterCounts {
  docTypes: LibraryFilterOption[];
  categories: LibraryFilterOption[];
  brands: LibraryFilterOption[];
}

export type LibrarySort = 'title' | 'updated';
