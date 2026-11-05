import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';
import { randomUUID } from 'crypto';
import { extensionForMimeType } from '../common/upload.constraints';
import { StorageService } from 'src/storage/storage.service';
import { IdentificationResponseDto } from './dto/identification-response.dto';
import { IdentificationResultDto } from './dto/identification-result.dto';

@Injectable()
export class IdentificationService {
  private readonly logger = new Logger(IdentificationService.name);
  private readonly serviceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {
    this.serviceUrl = this.configService.get<string>(
      'IDENTIFICATION_SERVICE_URL',
      'http://device-identification:8000',
    );
  }

  async identifyImage(file: any): Promise<IdentificationResponseDto> {
    const startTime = Date.now();

    this.logger.log(
      `Forwarding identification request for file: ${file.originalname}`,
    );
    this.logger.log('Device identification request received', {
      event: 'device_identification_request',
      category: 'device_identification',
      filename: file?.originalname,
      mimetype: file?.mimetype,
      size_bytes: file?.size,
    });

    // Upload image to storage before analysis so the URL can be returned
    let imageUrl: string | undefined;
    try {
      // Extension comes from the MIME type validated by the file filter, not
      // from the caller's filename — the stored file is served back from our
      // own origin, so letting the caller pick `.html` would be stored XSS.
      const ext = extensionForMimeType(file.mimetype);
      const filename = `${randomUUID()}${ext}`;
      const uploaded = await this.storageService.uploadFile(file.buffer, {
        folder: 'identification',
        filename,
        mimeType: file.mimetype,
      });
      imageUrl = uploaded.url;
    } catch (uploadError) {
      this.logger.warn(
        `Failed to upload identification image to storage: ${uploadError.message}`,
      );
      // Non-blocking: proceed with analysis even if storage upload fails
    }

    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file?.originalname,
      contentType: file?.mimetype,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.serviceUrl}/analyze`, formData, {
          headers: {
            ...formData.getHeaders(),
          },
        }),
      );

      const result = response.data as IdentificationResultDto;
      const durationMs = Date.now() - startTime;

      this.logger.log('Device identification succeeded', {
        event: 'device_identification_success',
        category: 'device_identification',
        duration_ms: durationMs,
        identified_brand: result?.Brand ?? null,
        identified_model: result?.Model ?? null,
        identified_product: result?.Product ?? null,
        has_gtin: Boolean(result?.GTIN),
        has_release_date: Boolean(result?.ReleaseDate),
      });

      return {
        success: true,
        data: result,
        imageUrl,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const httpStatus: number | null = error.response?.status ?? null;
      const errorMessage: string =
        error.response?.data?.detail || error.message;

      if (httpStatus === 422) {
        this.logger.warn(`No device found in image: ${file.originalname}`);
        this.logger.warn('No device recognized in image', {
          event: 'device_identification_not_found',
          category: 'device_identification',
          duration_ms: durationMs,
          filename: file.originalname,
        });

        return {
          success: false,
          notFound: true,
          data: null,
          error: errorMessage,
          imageUrl,
          timestamp: new Date().toISOString(),
        };
      }

      this.logger.error(
        `Error calling identification service: ${error.message}`,
        error.stack,
      );
      this.logger.error('Device identification failed', {
        event: 'device_identification_failure',
        category: 'device_identification',
        duration_ms: durationMs,
        error_message: errorMessage,
        http_status: httpStatus,
      });

      return {
        success: false,
        notFound: false,
        data: null,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
