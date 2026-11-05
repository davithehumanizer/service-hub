import { ApiProperty } from '@nestjs/swagger';
import { DeviceCategoryDto } from './device-category.dto';
import { DeviceTechnicalPropertyDto } from './device-technical-property.dto';
import { DeviceInformationalPropertyDto } from './device-informational-property.dto';
import { DevicePhotoDto } from './device-photo.dto';
import {
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DeviceDto {
  static name = 'Device';
  @ApiProperty()
  @IsNumber()
  device_id: number;

  @ApiProperty({
    required: false,
    description: 'Stable identifier, `urn:care2repair:device:{device_id}`',
    example: 'urn:care2repair:device:399307',
  })
  @IsOptional()
  @IsString()
  urn?: string;

  @ApiProperty()
  @IsString()
  ean: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  serial_number?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  product_code?: string;

  @ApiProperty()
  @IsString()
  manufacturer: string;

  @ApiProperty()
  @IsString()
  brand: string;

  @ApiProperty()
  @IsString()
  model: string;

  @ApiProperty({ type: [DeviceCategoryDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DeviceCategoryDto)
  categories: DeviceCategoryDto[] | number[];

  @ApiProperty()
  @IsString()
  device_type: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'The device model this entry is a variant of (`/api/v2/device-models/{id}`); null until it is assigned',
    example: 188673,
  })
  @IsOptional()
  @IsNumber()
  model_id: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'What tells this variant from the others of its model, from its technical properties, in English',
    example: '128 GB · Black',
  })
  @IsOptional()
  @IsString()
  variant_label: string | null;

  @ApiProperty({
    description: 'Sold refurbished, by a reseller under its own brand',
  })
  @IsOptional()
  @IsBoolean()
  is_refurbished: boolean;

  @ApiProperty()
  @IsString()
  @IsOptional()
  source: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  import_id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  import_date: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  source_id: string;

  @ApiProperty({ type: [DeviceTechnicalPropertyDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DeviceTechnicalPropertyDto)
  technicalProperties?: DeviceTechnicalPropertyDto[];

  @ApiProperty({ type: [DeviceInformationalPropertyDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DeviceInformationalPropertyDto)
  informationalProperties?: DeviceInformationalPropertyDto[];

  @ApiProperty({ type: [DevicePhotoDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DevicePhotoDto)
  photos?: DevicePhotoDto[];
}
