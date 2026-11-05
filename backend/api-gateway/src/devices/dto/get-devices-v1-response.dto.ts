import { ApiProperty } from '@nestjs/swagger';
import { DeviceDto } from './device.dto';

export class GetDevicesV1ResponseDto {
  static name = 'Device.ListV1';

  @ApiProperty({
    type: [DeviceDto],
    description: 'Array of devices',
  })
  data: DeviceDto[];
}
