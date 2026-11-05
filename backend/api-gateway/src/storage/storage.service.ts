import { UploadOptions, UploadResult } from './storage.types';

export abstract class StorageService {
  abstract uploadFile(
    buffer: Buffer,
    options: UploadOptions,
  ): Promise<UploadResult>;
  abstract deleteFile(key: string): Promise<void>;
  abstract getPublicUrl(key: string): string;
}
