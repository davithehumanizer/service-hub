import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRepairerReportStatusDto {
  static name = 'Repairer.Report.UpdateStatus';

  @ApiProperty({
    description: 'New status for the report',
    enum: ['reviewed', 'dismissed'],
  })
  @IsIn(['reviewed', 'dismissed'])
  status: 'reviewed' | 'dismissed';
}
