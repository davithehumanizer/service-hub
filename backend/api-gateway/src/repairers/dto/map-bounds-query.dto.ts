import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsNumber,
  IsIn,
  IsLatitude,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  PARTNER_TYPE_WHITELIST,
  splitPartnerTypes,
} from '../constants/partner-type-whitelist';

/**
 * The visible map rectangle, plus the filters already applied to the list.
 *
 * The four edges are required: without them the query would answer for the
 * whole world, which is the 25 MB response this endpoint exists to avoid.
 *
 * Longitudes are deliberately not bounded to [-180, 180] here — panning across
 * several copies of the world makes Leaflet report values outside that range,
 * and rejecting them would turn an ordinary gesture into an error. The service
 * normalises them instead.
 */
export class MapBoundsQueryDto {
  @ApiProperty({ description: 'Northern edge of the visible map' })
  @Type(() => Number)
  @IsLatitude()
  north: number;

  @ApiProperty({ description: 'Southern edge of the visible map' })
  @Type(() => Number)
  @IsLatitude()
  south: number;

  @ApiProperty({ description: 'Eastern edge of the visible map' })
  @Type(() => Number)
  @IsNumber()
  east: number;

  @ApiProperty({ description: 'Western edge of the visible map' })
  @Type(() => Number)
  @IsNumber()
  west: number;

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

  @ApiProperty({ description: 'Search by name, description or city', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Maximum markers to return before truncating',
    required: false,
    default: 500,
    minimum: 1,
    maximum: 2000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  limit?: number;
}
