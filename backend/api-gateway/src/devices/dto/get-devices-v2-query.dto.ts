import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class GetDevicesV2QueryDto {
  static name = 'Device.GetDevicesV2Query';

  @ApiProperty({
    description: 'Page number for pagination (starts from 1)',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(String(value), 10) : undefined))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(String(value), 10) : undefined))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description:
      'Search term for device names, models, brands, or manufacturers',
    example: 'iPhone',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Include technical and informational properties',
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  withProperties?: boolean = false;

  @ApiProperty({
    description:
      'Strict mode: match the full phrase exactly (brand + model). When false, uses fuzzy multi-field search.',
    example: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  strict?: boolean = false;

  @ApiProperty({
    description:
      'Comma-separated list of device category names to filter by (applied as post-filter, preserving facet counts)',
    example: 'Smartphones,Laptops',
    required: false,
  })
  @IsOptional()
  @IsString()
  categories?: string;

  @ApiProperty({
    description:
      'Sort order for results. Non-relevance sorts bypass Elasticsearch.',
    example: 'brandAZ',
    required: false,
    enum: ['relevance', 'brandAZ', 'modelAZ'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;
}
