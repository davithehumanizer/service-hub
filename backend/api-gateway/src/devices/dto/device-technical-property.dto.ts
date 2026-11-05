import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class DeviceTechnicalPropertyDto {
  static name = 'Device.TechnicalProperty';
  @ApiProperty()
  @IsOptional()
  @IsNumber()
  property_id?: number;

  @ApiProperty()
  @IsString()
  property_name: string;

  @ApiProperty()
  @IsString()
  property_value: string;
}
