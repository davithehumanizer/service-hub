import { ApiProperty } from '@nestjs/swagger';

export class OAuth2TokenResponseDto {
  static name = 'Auth.OAuth2.TokenResponse';
  @ApiProperty({
    description: 'OAuth2 access token (RS256-signed JWT)',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
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
    description: 'OAuth2 scope',
    example: 'read write',
    required: false,
  })
  scope?: string;

  @ApiProperty({
    description:
      'OIDC ID token (RS256-signed JWT). Only present when the "openid" scope was requested via the authorization_code or refresh_token grant.',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  id_token?: string;

  @ApiProperty({
    description:
      'Refresh token. Present for authorization_code and refresh_token grants. Use with the refresh_token grant to obtain a new access token.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
  })
  refresh_token?: string;
}
