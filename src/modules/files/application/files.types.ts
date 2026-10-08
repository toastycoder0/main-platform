export interface FileUploadResponse {
  uploadUrl: string;
  tempKey: string;
  finalKey: string;
}

export interface FileConfirmResponse {
  fileKey: string;
}

export interface FileDTO {
  key: string;
  url: string;
}
