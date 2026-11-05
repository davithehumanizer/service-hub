import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Payload accepted by the public frontend log ingest.
 *
 * The endpoint is unauthenticated and writes straight into Elasticsearch, so
 * every field is bounded: it previously took `@Body() body: any` and forwarded
 * it verbatim.
 */
export class IngestLogDto {
  static name = 'Logs.Ingest';

  @ApiProperty({ description: 'Short action identifier', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  action: string;

  @ApiProperty({ required: false, enum: ['info', 'warn', 'error'] })
  @IsOptional()
  @IsIn(['info', 'warn', 'error'])
  level?: 'info' | 'warn' | 'error';

  @ApiProperty({ required: false, maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  url?: string;

  @ApiProperty({ required: false, maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;

  @ApiProperty({
    required: false,
    description:
      'Free-form context. Serialised size is capped by the controller.',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
