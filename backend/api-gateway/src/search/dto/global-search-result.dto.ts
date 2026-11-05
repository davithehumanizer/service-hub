import { ApiProperty } from '@nestjs/swagger';

export class GlobalSearchResultDto {
  @ApiProperty({
    description: "The id within its type: a model's, a repairer's, a part's",
    example: '877165',
  })
  id: string;

  @ApiProperty({
    description:
      'A device model (one result per model, not per catalogue entry), a repairer or a spare part',
    enum: ['device-model', 'repairer', 'spare-part'],
    example: 'device-model',
  })
  type: 'device-model' | 'repairer' | 'spare-part';

  @ApiProperty({ example: 'Samsung Galaxy S23' })
  title: string;

  @ApiProperty({ required: false, example: 'Smart Phone / Pager' })
  subtitle?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  thumbnail?: string;

  @ApiProperty({
    description: 'Where the result opens in the site',
    example: '/app/model/877165',
  })
  link: string;

  @ApiProperty({
    required: false,
    description: 'Relevance within its own type only',
  })
  score?: number;
}
