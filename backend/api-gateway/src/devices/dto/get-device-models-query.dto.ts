import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsBoolean,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export const DEVICE_MODEL_SORTS = [
  'relevance',
  'brandAZ',
  'brandZA',
  'modelAZ',
  'modelZA',
] as const;

export class GetDeviceModelsQueryDto {
  static name = 'DeviceModel.SearchQuery';

  @ApiProperty({
    description: 'Page number (starts from 1)',
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
    description: 'Number of models per page',
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
      'Words to find in the brand, the name or a category, all of them. Typos are forgiven in words without digits only; a barcode matches any of its GTIN forms.',
    example: 'galaxy s23',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description:
      'Match `search` as a phrase within brand + name, for a name read from a photo.',
    example: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  strict?: boolean = false;

  @ApiProperty({
    description:
      'Canonical category names to filter by, one `categories` parameter each: a name may contain a comma. Applied after the facets, which keep counting every category.',
    example: ['Smart Phone / Pager', 'Laptop'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => [value].flat())
  @ArrayMaxSize(50)
  @IsString({ each: true })
  categories?: string[];

  @ApiProperty({
    description:
      'Order of the models. `relevance` puts, among equal matches, the models with the most variants first.',
    enum: DEVICE_MODEL_SORTS,
    example: 'relevance',
    required: false,
  })
  @IsOptional()
  @IsIn(DEVICE_MODEL_SORTS)
  sortBy?: (typeof DEVICE_MODEL_SORTS)[number] = 'relevance';
}

export class GetDeviceModelQueryDto {
  static name = 'DeviceModel.VariantsQuery';

  @ApiProperty({
    description: 'Page of variants (starts from 1)',
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
    description: 'Number of variants per page',
    example: 20,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(String(value), 10) : undefined))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description:
      'Words each variant must have in its label, its reference, its seller or its barcode',
    example: '16 GB Black',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiProperty({
    description:
      'Parts each variant must have, `key:value`, one `parts` parameter each, as the facets name them.',
    example: ['storage:256 GB', 'colour:Green'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => [value].flat())
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  parts?: string[];

  @ApiProperty({
    description: 'One variant of the model, to read its parts',
    example: 1067188,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(String(value), 10) : undefined))
  @IsInt()
  @Min(1)
  variant?: number;
}

export class LookupDeviceModelQueryDto {
  static name = 'DeviceModel.LookupQuery';

  @ApiProperty({
    description:
      "A barcode (EAN-8 to GTIN-14, any of its GTIN forms) or a manufacturer's reference.",
    example: '0197528549958',
  })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  code: string;
}
