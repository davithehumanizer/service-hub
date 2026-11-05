import { ApiProperty } from '@nestjs/swagger';

export class DevicePhotoDto {
  static name = 'Device.Photo';

  @ApiProperty()
  id: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  createdAt: Date;
}
