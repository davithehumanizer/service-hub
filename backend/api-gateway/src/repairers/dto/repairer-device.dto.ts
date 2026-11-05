import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class RepairerDeviceDto {
  static name = 'Repairer.Device';
  @ApiProperty({ description: 'Repairer device id' })
  @IsNumber()
  repairer_device_id: number;

  @ApiProperty({ description: 'Device type' })
  @IsString()
  device_type: string;
}
