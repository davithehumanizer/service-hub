import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { DEVICE_TYPE_WHITELIST } from '../constants/device-type-whitelist';

export class CreateRepairerDeviceDto {
  static name = 'Repairer.Device.Create';

  @ApiProperty({
    description: 'Device type',
    enum: DEVICE_TYPE_WHITELIST,
  })
  @IsIn(DEVICE_TYPE_WHITELIST)
  device_type: string;
}
