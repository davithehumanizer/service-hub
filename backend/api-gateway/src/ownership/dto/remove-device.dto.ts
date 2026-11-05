import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class RemoveDeviceDto {
  static name = 'Ownership.RemoveDevice';
  @ApiProperty({
    description: 'The ID of the device to remove',
    example: 101,
    type: Number,
  })
  @IsNumber()
  deviceId: number;

  @ApiProperty({
    description: 'The ID of the user to remove the device from',
    example: 1,
    type: Number,
  })
  @IsNumber()
  userId: number;
}
