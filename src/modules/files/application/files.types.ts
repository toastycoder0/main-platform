import type { FileEntity } from '@/shared/constants/file-registry';

export interface FileUploadResponse {
  uploadUrl: string;
  tempKey: string;
}

export interface FileConfirmResponse {
  fileKey: string;
}

export interface FileDTO {
  id: string;
  key: string;
  url: string;
  sortOrder: number;
}

export interface FileLocator {
  entity: FileEntity;
  scope: string;
  ownerId: string;
}
