import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TechnicalPropertyDto {
  @IsString()
  property_name: string;

  @IsString()
  property_value: string;
}

export class InformationalPropertyDto {
  @IsString()
  property_name: string;

  @IsString()
  property_value: string;
}

export class CreateDeviceDto {
  @IsString()
  ean: string;

  @IsOptional()
  @IsString()
  serial_number?: string;

  @IsOptional()
  @IsString()
  product_code?: string;

  @IsString()
  manufacturer: string;

  @IsString()
  brand: string;

  @IsString()
  model: string;

  // Categories as array of category IDs
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  categories?: number[];

  @IsString()
  device_type: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  import_id?: string;

  @IsOptional()
  // @IsDateString() // Or IsDate if transformed
  import_date?: Date;

  @IsOptional()
  @IsString()
  source_id?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TechnicalPropertyDto)
  technicalProperties?: TechnicalPropertyDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InformationalPropertyDto)
  informationalProperties?: InformationalPropertyDto[];
}
