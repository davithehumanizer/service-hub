import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class YoutubeSearchQueryDto {
  static name = 'External.Youtube.Search';
  @ApiProperty({
    description: 'Search query used to find repair tutorial videos on YouTube',
    example: 'iPhone 14 Pro Max',
  })
  @IsString()
  query: string;
}
