import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class DeviceCategoryDto {
  static name = 'Device.Category';
  @ApiProperty()
  @IsNumber()
  id: number;

  @ApiProperty({
    required: false,
    description: 'Stable identifier, `urn:care2repair:category:{id}`',
    example: 'urn:care2repair:category:1',
  })
  @IsOptional()
  @IsString()
  urn?: string;

  @ApiProperty({ description: "In the caller's language when translated" })
  @IsString()
  name: string;

  @ApiProperty({
    required: false,
    description:
      'The English name, the same in every language: match on it, `name` being translated',
    example: 'Smart Phone / Pager',
  })
  @IsOptional()
  @IsString()
  canonicalName?: string;

  @ApiProperty({ required: false })
  @IsString()
  unukey?: string;

  @ApiProperty()
  @IsBoolean()
  is_electrical: boolean;

  @ApiProperty({
    required: false,
    description: 'iFixit wiki slug this category maps to, when one was decided',
    example: 'Washing_Machine',
  })
  @IsOptional()
  @IsString()
  ifixit_wikiid?: string | null;
}
