import { IsIn, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IfixitSearchQueryDto {
  static name = 'External.Ifixit.Search';
  @ApiProperty({
    description: 'Search query for iFixit devices',
    example: 'MacBook Pro',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Type of device',
    example: 'computer',
    required: false,
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({
    description: 'Subject category',
    example: 'repair',
    required: false,
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({
    description: 'Difficulty level',
    example: 'moderate',
    required: false,
  })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiProperty({
    description:
      'Device brand, used to build a more specific "brand + query" search candidate before falling back to query alone',
    example: 'Apple',
    required: false,
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({
    description:
      'Device category, used as a last-resort fallback search candidate when brand/model searches return no results',
    example: 'Smartphone',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description:
      'iFixit wiki slug mapped to the device category (device_categories.ifixit_wikiid). A decided mapping, read before any free-text fallback.',
    example: 'Washing_Machine',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryWikiId?: string;

  @ApiProperty({
    description:
      "Language of the guides' titles, subjects and links, from iFixit's own translations. English when absent.",
    example: 'de',
    required: false,
    enum: ['en', 'fr', 'de', 'nl'],
  })
  @IsOptional()
  @IsIn(['en', 'fr', 'de', 'nl'])
  lang?: string;
}
