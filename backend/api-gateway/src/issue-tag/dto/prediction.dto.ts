import { ApiProperty } from '@nestjs/swagger';

export class IssueTagPredictionDto {
  static name = 'IssueTag.Prediction';

  @ApiProperty({
    description:
      'Issue category label (e.g. MECHANICAL, POWER_ELECTRICAL, BEHAVIOUR_SYMPTOM)',
    example: 'BEHAVIOUR_SYMPTOM',
  })
  label: string;

  @ApiProperty({
    description: 'Confidence score between 0 and 1',
    example: 0.9992,
  })
  score: number;
}
