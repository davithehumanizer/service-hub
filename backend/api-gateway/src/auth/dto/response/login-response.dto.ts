import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  static name = 'Auth.LoginResponse';
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  token_type: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expires_in: number;

  @ApiProperty({
    description:
      'Opaque single-use refresh token. Exchange it at POST /auth/refresh to obtain a new access token.',
    example: 'k7Qb1s_9k0Zc...',
  })
  refresh_token: string;

  @ApiProperty({
    description: 'User information',
    type: 'object',
    properties: {
      id: { type: 'number', example: 1 },
      email: { type: 'string', example: 'user@example.com' },
      role: { type: 'string', example: 'user' },
    },
  })
  user: {
    id: number;
    email: string;
    role: string;
  };
}
