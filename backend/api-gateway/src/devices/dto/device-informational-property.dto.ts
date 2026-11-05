import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class DeviceInformationalPropertyDto {
  @ApiProperty()
  @IsNumber()
  property_id: number;

  @ApiProperty()
  @IsString()
  property_name: string;

  @ApiProperty()
  @IsString()
  property_value: string;
}
