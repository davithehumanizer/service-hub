import { ApiProperty } from '@nestjs/swagger';
import { DeviceDto } from './device.dto';

export class DevicePaginationDto {
  static name = 'Device.Pagination';

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of devices',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 15,
  })
  totalPages: number;
}

export class GetDevicesResponseDto {
  static name = 'Device.GetDevicesResponse';

  @ApiProperty({
    description: 'Array of devices for the current page',
    type: [DeviceDto],
  })
  data: DeviceDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: DevicePaginationDto,
  })
  pagination: DevicePaginationDto;
}
