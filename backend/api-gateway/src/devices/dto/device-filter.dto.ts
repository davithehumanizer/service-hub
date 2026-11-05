import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class DeviceFilterDto {
  static name = 'Device.Filter';
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
}
