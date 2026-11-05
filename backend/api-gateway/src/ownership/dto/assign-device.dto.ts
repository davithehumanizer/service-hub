import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsDateString } from 'class-validator';

export class AssignDeviceDto {
  static name = 'Ownership.AssignDevice';
  @ApiProperty({
    description: 'The ID of the user to assign the device to',
    example: 1,
    type: Number,
  })
  @IsNumber()
  userId: number;

  @ApiProperty({
    description: 'The ID of the device to assign',
    example: 101,
    type: Number,
  })
  @IsNumber()
  deviceId: number;

  @ApiPropertyOptional({
    description: 'The date when the device was acquired',
    example: '2023-01-01T12:00:00Z',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  acquiredAt?: string;
}
