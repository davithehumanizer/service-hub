import { ApiProperty } from '@nestjs/swagger';
import { DeviceDto } from './device.dto';

export class DevicePaginationV2Dto {
  static name = 'Device.PaginationV2';

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

export class GetDevicesV2ResponseDto {
  static name = 'Device.GetDevicesV2Response';

  @ApiProperty({
    description: 'Array of devices for the current page',
    type: [DeviceDto],
  })
  data: DeviceDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: DevicePaginationV2Dto,
  })
  pagination: DevicePaginationV2Dto;

  @ApiProperty({
    description:
      'Device count per category name, computed from the text search context (ignores active category filters)',
    example: { Smartphones: 42, Laptops: 18 },
    required: false,
  })
  categoryFacets: Record<string, number>;
}
