import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/**
 * DTO for OAuth2 Authorization Request (GET /oauth2/authorize)
 */
export class OAuth2AuthorizeDto {
  static name = 'Auth.OAuth2Authorize';

  @ApiProperty({
    description: 'OAuth2 client identifier',
    example: 'dss-client',
  })
  @IsString()
  client_id: string;

  @ApiProperty({
    description: 'Redirect URI for the callback',
    example: 'https://dss.example.com/callback',
  })
  @IsString()
  redirect_uri: string;

  @ApiProperty({
    description: 'Response type (must be "code")',
    example: 'code',
  })
  @IsString()
  response_type: string;

  @ApiPropertyOptional({
    description: 'Requested scopes (space-separated)',
    example: 'openid profile email',
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({
    description: 'State parameter for CSRF protection',
    example: 'xyz123',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'PKCE code challenge (base64url(sha256(code_verifier)))',
    example: 'abc123...',
  })
  @IsOptional()
  @IsString()
  code_challenge?: string;

  @ApiPropertyOptional({
    description: 'PKCE code challenge method (must be S256)',
    example: 'S256',
  })
  @IsOptional()
  @IsString()
  code_challenge_method?: string;

  @ApiPropertyOptional({
    description: 'OIDC nonce — echoed in id_token to prevent replay attacks',
    example: 'nonce-abc123',
  })
  @IsOptional()
  @IsString()
  nonce?: string;
}
