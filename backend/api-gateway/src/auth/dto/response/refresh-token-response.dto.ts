import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenResponseDto {
  static name = 'Auth.RefreshTokenResponse';
  @ApiProperty({
    description: 'New JWT access token',
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
      'Rotated refresh token. The token used for this call is now consumed and must be discarded.',
    example: 'k7Qb1s_9k0Zc...',
  })
  refresh_token: string;
}
