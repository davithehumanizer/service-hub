import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetDevicesQueryDto {
  static name = 'Device.GetDevicesQuery';

  @ApiProperty({
    description: 'Page number for pagination (starts from 1)',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(String(value), 10) : undefined))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(String(value), 10) : undefined))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description:
      'Search term for device names, models, brands, or manufacturers',
    example: 'iPhone',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}
