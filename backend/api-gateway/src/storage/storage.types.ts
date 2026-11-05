export interface UploadOptions {
  folder: string;
  filename: string;
  mimeType: string;
}

export interface UploadResult {
  url: string;
  key: string;
}
