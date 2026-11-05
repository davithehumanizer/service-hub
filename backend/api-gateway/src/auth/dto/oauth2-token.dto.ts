import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class OAuth2TokenDto {
  static name = 'Auth.OAuth2.Token';
  @ApiProperty({
    description: 'OAuth2 client ID',
    example: 'client_id_here',
    required: false,
  })
  @IsOptional()
  @IsString()
  client_id?: string;

  @ApiProperty({
    description: 'OAuth2 client secret',
    example: 'client_secret_here',
    required: false,
  })
  @IsOptional()
  @IsString()
  client_secret?: string;

  @ApiProperty({
    description: 'OAuth2 grant type',
    example: 'client_credentials',
  })
  @IsString()
  grant_type: string;

  @ApiProperty({
    description: 'Authorization code (for authorization_code grant)',
    example: 'auth_code_here',
    required: false,
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    description: 'Redirect URI (for authorization_code grant)',
    example: 'http://localhost:4000/callback',
    required: false,
  })
  @IsOptional()
  @IsString()
  redirect_uri?: string;

  @ApiProperty({
    description: 'PKCE code verifier (for authorization_code grant)',
    example: 'verifier123',
    required: false,
  })
  @IsOptional()
  @IsString()
  code_verifier?: string;

  @ApiProperty({
    description: 'Refresh token (for refresh_token grant)',
    example: 'uuid-token-here',
    required: false,
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
