import { ApiProperty } from '@nestjs/swagger';

export class IdentificationResultDto {
  static name = 'Identification.Result';

  @ApiProperty({ description: 'The identified product type' })
  Product: string;

  @ApiProperty({ description: 'The brand of the product' })
  Brand: string;

  @ApiProperty({ description: 'The model identifier' })
  Model: string;

  @ApiProperty({ description: 'The estimated release date' })
  ReleaseDate: string;

  @ApiProperty({
    description: 'The estimated end of life date',
    required: false,
  })
  EndOfLifeDate?: string;

  @ApiProperty({ description: 'Global Trade Item Number', required: false })
  GTIN?: string;
}
