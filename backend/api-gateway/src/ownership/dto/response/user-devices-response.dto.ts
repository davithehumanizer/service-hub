import { ApiProperty } from '@nestjs/swagger';
import { DeviceOwnershipDto } from './device-ownership.dto';

export class UserDevicesResponseDto {
  static name = 'Ownership.UserDevicesResponse';
  @ApiProperty({
    description: 'List of device ownerships for the user',
    type: [DeviceOwnershipDto],
  })
  devices: DeviceOwnershipDto[];

  @ApiProperty({
    description: 'Total number of devices owned by the user',
    example: 5,
    type: Number,
  })
  total: number;
}
