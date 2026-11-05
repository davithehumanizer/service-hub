import { ApiProperty } from '@nestjs/swagger';

export class PlatformSummaryDto {
  static name = 'RepairMonitor.PlatformSummary';

  @ApiProperty({ description: 'Repair records' })
  totalRepairs: number;

  @ApiProperty({
    description:
      'Device models covered, not catalogue entries: about 242,000 models for 1.12 M entries',
  })
  totalDevices: number;

  @ApiProperty({ description: 'Repairers listed' })
  totalRepairers: number;
}
