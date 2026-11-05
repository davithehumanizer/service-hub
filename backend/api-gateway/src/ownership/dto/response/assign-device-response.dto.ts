import { ApiProperty } from '@nestjs/swagger';

export class AssignDeviceResponseDto {
  static name = 'Ownership.AssignDeviceResponse';
  @ApiProperty({
    description: 'Success message',
    example: 'Device assigned to user successfully',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'The ownership record ID',
    example: 'ownership-uuid-123',
    type: String,
  })
  ownershipId: string;

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
