import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class StatsFilterDto {
  static name = 'RepairMonitor.StatsFilter';

  @ApiProperty({ required: false, example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({ required: false, example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({ required: false, example: 'BEL' })
  @IsOptional()
  @IsString()
  country?: string;
}
