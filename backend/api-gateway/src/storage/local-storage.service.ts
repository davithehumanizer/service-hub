import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from './storage.service';
import { UploadOptions, UploadResult } from './storage.types';

@Injectable()
export class LocalStorageService extends StorageService {
  private readonly uploadDir: string;
  private readonly publicBaseUrl: string;
  private readonly logger = new Logger(LocalStorageService.name);

  constructor(private readonly configService: ConfigService) {
    super();
    this.uploadDir = this.configService.get<string>(
      'LOCAL_STORAGE_PATH',
      '/app/uploads',
    );
    this.publicBaseUrl = this.configService.get<string>(
      'LOCAL_STORAGE_PUBLIC_URL',
      'http://localhost:3000/api/uploads',
    );
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async uploadFile(
    buffer: Buffer,
    options: UploadOptions,
  ): Promise<UploadResult> {
    const folderPath = path.join(this.uploadDir, options.folder);
    fs.mkdirSync(folderPath, { recursive: true });

    const filePath = path.join(folderPath, options.filename);
    await fs.promises.writeFile(filePath, buffer);

    const key = `${options.folder}/${options.filename}`;
    this.logger.log(`Saved file locally: ${filePath}`);

    return {
      key,
      url: this.getPublicUrl(key),
    };
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    try {
      await fs.promises.unlink(filePath);
      this.logger.log(`Deleted local file: ${filePath}`);
    } catch {
      // File may not exist — ignore
    }
  }

  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }
}
