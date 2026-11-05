import { ApiProperty } from '@nestjs/swagger';
import { RepairerDeviceDto } from './repairer-device.dto';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PARTNER_TYPE_WHITELIST } from '../constants/partner-type-whitelist';

export class RepairerDto {
  static name = 'Repairer';
  @ApiProperty({ description: 'Repairer UUID' })
  @IsString()
  repairer_id: string;

  @ApiProperty({ description: 'Import id', required: false })
  @IsOptional()
  @IsString()
  repairer_import_id?: string;

  @ApiProperty({ description: 'Name of the repairer' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code (e.g. "FR")',
    required: false,
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    description: 'Full English country name (e.g. "France")',
    required: false,
  })
  @IsOptional()
  @IsString()
  countryName?: string;

  @ApiProperty({ description: 'Postal code', required: false })
  @IsOptional()
  @IsString()
  postal_code?: string;

  @ApiProperty({ description: 'City', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: 'Website', required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ description: 'Contact email', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: 'Contact phone', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Latitude', required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ description: 'Longitude', required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ description: 'Source', required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({
    description: 'Partner type (repairer, recycler, other, both)',
    required: false,
    enum: PARTNER_TYPE_WHITELIST,
  })
  @IsOptional()
  @IsIn(PARTNER_TYPE_WHITELIST)
  partner_type?: string;

  @ApiProperty({ type: [RepairerDeviceDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RepairerDeviceDto)
  repairerDevices?: RepairerDeviceDto[];
}
