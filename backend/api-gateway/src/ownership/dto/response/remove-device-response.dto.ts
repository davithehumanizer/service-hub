import { ApiProperty } from '@nestjs/swagger';

export class RemoveDeviceResponseDto {
  static name = 'Ownership.RemoveDeviceResponse';
  @ApiProperty({
    description: 'Success message',
    example: 'Device removed from user successfully',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'The user ID',
    example: 1,
    type: Number,
  })
  userId: number;

  @ApiProperty({
    description: 'The device ID',
    example: 101,
    type: Number,
  })
  deviceId: number;
}
