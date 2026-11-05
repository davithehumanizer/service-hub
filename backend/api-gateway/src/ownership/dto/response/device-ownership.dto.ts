import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeviceOwnershipDto {
  @ApiProperty({
    description: 'The unique identifier of the ownership record',
    example: 'ownership-uuid-123',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'The ID of the user who owns the device',
    example: 1,
    type: Number,
  })
  userId: number;

  @ApiProperty({
    description: 'The ID of the owned device',
    example: 101,
    type: Number,
  })
  deviceId: number;

  @ApiPropertyOptional({
    description: 'The date when the device was acquired',
    example: '2023-01-01T12:00:00Z',
    type: String,
  })
  acquiredAt?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-10-27T10:00:00Z',
    type: String,
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-10-27T10:00:00Z',
    type: String,
  })
  updatedAt: string;
}
