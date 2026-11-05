import { ApiProperty } from '@nestjs/swagger';
import { IssueTagPredictionDto } from './prediction.dto';

export class IssueTagClassifyResponseDto {
  static name = 'IssueTag.ClassifyResponse';

  @ApiProperty({
    description: 'The original input string that was classified',
    example: 'Coffee machine does turn on but does not heat',
  })
  input: string;

  @ApiProperty({
    description: 'The top predicted issue category',
    type: [IssueTagPredictionDto],
  })
  finalPrediction: IssueTagPredictionDto[];

  @ApiProperty({
    description: 'All predicted issue categories with their confidence scores',
    type: [IssueTagPredictionDto],
  })
  predictions: IssueTagPredictionDto[];
}
