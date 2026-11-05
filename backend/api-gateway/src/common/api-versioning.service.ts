import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';

export interface VersionedMessage {
  cmd: string;
  version: string;
  [key: string]: any;
}

@Injectable()
export class ApiVersioningService {
  private readonly logger = new Logger(ApiVersioningService.name);

  /**
   * Extract API version from request URL or headers
   * Supports both URI versioning (/api/v1/...) and header versioning
   */
  extractVersion(request: Request): string {
    // Primary: URI versioning (e.g., /api/v1/devices)
    const urlMatch = request.url.match(/^\/api\/v(\d+)\//);
    if (urlMatch) {
      const version = `v${urlMatch[1]}`;
      this.logger.debug(`Version extracted from URI: ${version}`);
      return version;
    }

    // Secondary: Header versioning
    const headerVersion = request.headers['x-api-version'] as string;
    if (headerVersion) {
      const version = headerVersion.startsWith('v')
        ? headerVersion
        : `v${headerVersion}`;
      this.logger.debug(`Version extracted from header: ${version}`);
      return version;
    }

    // Fallback to v1 for backward compatibility
    this.logger.debug('No version specified, defaulting to v1');
    return 'v1';
  }

  /**
   * Create a versioned message for microservice communication
   */
  createVersionedMessage(
    cmd: string,
    payload: any,
    version: string,
  ): VersionedMessage {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return {
      cmd,
      version,
      ...payload,
    };
  }

  /**
   * Helper to send versioned message to microservice
   * This is a convenience method that can be used in controllers
   */
  createMessage(
    cmd: string,
    payload: any = {},
    version: string,
  ): VersionedMessage {
    const message = this.createVersionedMessage(cmd, payload, version);
    this.logger.debug(`Created versioned message`, { message });
    return message;
  }
}
