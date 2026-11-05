import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class AddJourneyPersonalDeviceDto {
  static name = 'RepairMonitor.AddJourneyPersonalDevice';

  @ApiPropertyOptional({
    description:
      'Another device of a model the user already has: without it, such a request is refused (409)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  another?: boolean;
}
