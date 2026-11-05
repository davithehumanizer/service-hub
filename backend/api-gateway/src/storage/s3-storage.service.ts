import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';
import { UploadOptions, UploadResult } from './storage.types';

@Injectable()
export class S3StorageService extends StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly logger = new Logger(S3StorageService.name);

  constructor(private readonly configService: ConfigService) {
    super();

    const region = this.configService.get<string>('S3_REGION', 'us-east-1');
    const endpoint = this.configService.get<string>('S3_ENDPOINT');

    this.bucket = this.configService.get<string>(
      'S3_BUCKET_NAME',
      'service-hub',
    );
    this.publicBaseUrl = this.configService.get<string>(
      'S3_PUBLIC_BASE_URL',
      endpoint
        ? `${endpoint}/${this.bucket}`
        : `https://${this.bucket}.s3.${region}.amazonaws.com`,
    );

    this.client = new S3Client({
      region,
      ...(endpoint && {
        endpoint,
        forcePathStyle: true,
      }),
      credentials: {
        accessKeyId: this.configService.get<string>(
          'AWS_ACCESS_KEY_ID',
          'test',
        ),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          'test',
        ),
      },
    });
  }

  async uploadFile(
    buffer: Buffer,
    options: UploadOptions,
  ): Promise<UploadResult> {
    const key = `${options.folder}/${options.filename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: options.mimeType,
      }),
    );

    this.logger.log(`Uploaded file to S3: ${key}`);

    return {
      key,
      url: this.getPublicUrl(key),
    };
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    this.logger.log(`Deleted file from S3: ${key}`);
  }

  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }
}
