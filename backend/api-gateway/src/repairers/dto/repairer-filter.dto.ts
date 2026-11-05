import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class RepairerFilterDto {
  static name = 'Repairer.Filter';
  @ApiProperty({ description: 'Filter id (string)' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Filter category (e.g. brand, country)' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Display name for the filter' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Optional icon URL or name', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({
    description: 'Number of repairers matching this filter (e.g. device_type)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  count?: number;
}
