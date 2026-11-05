import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  static name = 'User.ProfileResponse';
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User role',
    example: 'user',
    enum: ['user', 'admin'],
  })
  role: 'user' | 'admin';

  @ApiProperty({
    description: 'User profile data',
    type: 'object',
    additionalProperties: true,
  })
  profile: Record<string, any>;

  @ApiProperty({
    description: 'Account creation date',
    example: '2025-10-27T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Account last update date',
    example: '2025-10-27T10:00:00.000Z',
  })
  updatedAt: string;
}
