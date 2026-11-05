import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReportRepairerDto {
  static name = 'Repairer.Report.Create';

  @ApiPropertyOptional({
    description:
      'Optional context provided by the user explaining why this result seems irrelevant',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
