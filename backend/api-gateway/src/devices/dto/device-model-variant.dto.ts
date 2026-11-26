import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SourceField } from './source-field';

export class VariantPropertyDto {
  static name = 'DeviceModel.VariantProperty';

  @ApiProperty({
    description: "Icecat's name, as the catalogue stores it",
    example: 'Internal storage capacity',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  property_name: string;

  @ApiProperty({
    description: "In Icecat's unit for the name, Y or N for a yes or no",
    example: '256',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  property_value: string;
}

/** A variant entered under a model, or what changes in one. */
export class DeviceModelVariantInputDto {
  static name = 'DeviceModel.VariantInput';

  @ApiProperty({
    description:
      "Its barcode; a contributor's starts with 2. The barcode or the reference is required for a new variant.",
    example: '2000000000017',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsString()
  @Matches(/^(\d{8,14})?$/, { message: 'ean must be 8 to 14 digits' })
  ean?: string;

  @ApiProperty({
    description: "The manufacturer's reference",
    example: 'SM-S911BZKDEUB',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  product_code?: string;

  @ApiProperty({
    description:
      'Its technical properties; when sent, they replace those it had',
    type: [VariantPropertyDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(150)
  @ValidateNested({ each: true })
  @Type(() => VariantPropertyDto)
  technicalProperties?: VariantPropertyDto[];
}

/** A new variant: its source is set at creation, never changed after. */
export class NewDeviceModelVariantDto extends DeviceModelVariantInputDto {
  static name = 'DeviceModel.NewVariant';

  @SourceField()
  source?: string;
}
