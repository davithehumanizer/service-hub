import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TechnicalPropertyDto {
  static name = 'Device.CreateTechnicalProperty';
  @ApiProperty()
  @IsString()
  property_name: string;

  @ApiProperty()
  @IsString()
  property_value: string;
}

export class InformationalPropertyDto {
  static name = 'Device.CreateInformationalProperty';
  @ApiProperty()
  @IsString()
  property_name: string;

  @ApiProperty()
  @IsString()
  property_value: string;
}

export class CreateDeviceDto {
  static name = 'Device.Create';
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

  @ApiProperty({
    type: [Number],
    description: 'Array of category IDs to link to the device',
  })
  @IsArray()
  @IsNumber({}, { each: true })
  categories: number[];

  @ApiProperty()
  @IsString()
  device_type: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  import_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  // @IsDateString() // Or IsDate if transformed
  import_date?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  source_id?: string;

  @ApiProperty({ type: [TechnicalPropertyDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TechnicalPropertyDto)
  technicalProperties?: TechnicalPropertyDto[];

  @ApiProperty({ type: [InformationalPropertyDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InformationalPropertyDto)
  informationalProperties?: InformationalPropertyDto[];
}
