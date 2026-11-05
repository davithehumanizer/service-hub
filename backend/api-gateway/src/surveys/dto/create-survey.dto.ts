import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class CreateSurveyDto {
  @ApiProperty({
    description: 'The title of the survey',
    example: 'Customer Satisfaction',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Unique trigger key',
    example: 'post_repair_feedback',
  })
  @IsNotEmpty()
  @IsString()
  triggerKey: string;

  @ApiProperty({
    description: 'List of questions',
    example: [{ id: 'q1', text: 'Rate us?', type: 'rating' }],
  })
  @IsArray()
  questions: any[];
}
