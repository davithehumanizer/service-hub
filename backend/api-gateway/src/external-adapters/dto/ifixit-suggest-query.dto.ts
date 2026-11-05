import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IfixitSuggestQueryDto {
  static name = 'External.Ifixit.Suggest';
  @ApiProperty({
    description:
      'Partial device name to autocomplete against iFixit device/category wikis',
    example: 'iPhone 14 P',
  })
  @IsString()
  query: string;
}
