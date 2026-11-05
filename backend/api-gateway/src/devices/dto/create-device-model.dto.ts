import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MAX_ID } from 'src/common/database-id';
import { SourceField } from './source-field';

export class CreateDeviceModelDto {
  static name = 'DeviceModel.Create';

  @ApiProperty({ example: 'Fairphone' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand: string;

  @ApiProperty({ example: 'Fairphone 5' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Category ids. Ignored when the model already exists.',
    example: [173],
    required: false,
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(MAX_ID, { each: true })
  categories?: number[];

  @ApiProperty({
    description:
      'A barcode: the model gets it as its first variant, or is found by it if the catalogue has it.',
    example: '2000000000015',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsString()
  @Matches(/^\d{8,14}$/, { message: 'ean must be 8 to 14 digits' })
  ean?: string;

  @ApiProperty({
    description:
      "The manufacturer's reference, used like the barcode when there is none.",
    example: 'ABC-123-EU',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  product_code?: string;

  @SourceField()
  source?: string;
}
