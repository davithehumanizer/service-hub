import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class LinkDeviceDto {
  static name = 'RepairMonitor.LinkDevice';

  @ApiProperty({ example: 1234 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  deviceId: number;

  @ApiProperty({ example: 'urn:care2repair:device:1234' })
  @IsNotEmpty()
  @IsString()
  deviceUrn: string;
}
