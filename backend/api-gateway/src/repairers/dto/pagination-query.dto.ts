import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsNumber,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  PARTNER_TYPE_WHITELIST,
  splitPartnerTypes,
} from '../constants/partner-type-whitelist';

export class PaginationQueryDto {
  @ApiProperty({
    description: 'Page number',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    required: false,
    default: 50,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 50;

  @ApiProperty({ description: 'Filter by country code', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ description: 'Filter by device type', required: false })
  @IsOptional()
  @IsString()
  device_type?: string;

  @ApiProperty({
    description: `Filter by partner types, comma-separated: a place matches if it has any of them. One of ${PARTNER_TYPE_WHITELIST.join(', ')}.`,
    required: false,
    type: String,
    example: 'repairer,reuse',
  })
  @IsOptional()
  @Transform(splitPartnerTypes)
  @IsIn(PARTNER_TYPE_WHITELIST, { each: true })
  partner_type?: string[];

  @ApiProperty({ description: 'Search by name', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'User latitude for distance sorting',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiProperty({
    description: 'User longitude for distance sorting',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  // Restrict the list to the visible map rectangle, so it shows the same
  // repairers as the markers rather than an unrelated page. All four edges are
  // needed together; a partial rectangle is ignored rather than half-applied.
  @ApiProperty({ description: 'Northern edge of the visible map', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  north?: number;

  @ApiProperty({ description: 'Southern edge of the visible map', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  south?: number;

  @ApiProperty({ description: 'Eastern edge of the visible map', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  east?: number;

  @ApiProperty({ description: 'Western edge of the visible map', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  west?: number;
}
