import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FluentLoggerService } from './fluent-logger.service';
import { IngestLogDto } from './dto/ingest-log.dto';
import { Throttle } from '@nestjs/throttler';

/** Beyond this, the metadata blob is dropped rather than forwarded to Elasticsearch. */
const MAX_METADATA_BYTES = 8 * 1024;

@ApiTags('Logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logger: FluentLoggerService) {}

  @Post()
  // Unauthenticated write into Elasticsearch: generous enough for real
  // frontend telemetry, low enough that it is not free storage.
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ingest logs from frontend' })
  @ApiResponse({ status: 200, description: 'Log received' })
  create(@Body() body: IngestLogDto) {
    const { action, metadata, level = 'info', url, userAgent } = body;

    // Unauthenticated ingest: keep the blob bounded so a caller cannot use the
    // log pipeline as free, unbounded storage.
    let safeMetadata: Record<string, unknown> = metadata ?? {};
    if (JSON.stringify(safeMetadata).length > MAX_METADATA_BYTES) {
      safeMetadata = { truncated: true };
    }

    const enrichedMetadata = {
      ...safeMetadata,
      frontendUrl: url,
      frontendUserAgent: userAgent,
    };

    if (level === 'error') {
      this.logger.error(`[Frontend] ${action}`, enrichedMetadata);
    } else if (level === 'warn') {
      this.logger.warn(`[Frontend] ${action}`, enrichedMetadata);
    } else {
      this.logger.log(`[Frontend] ${action}`, enrichedMetadata);
    }

    return { success: true };
  }
}
