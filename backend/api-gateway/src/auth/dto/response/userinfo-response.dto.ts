import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for OAuth2 UserInfo Response (GET /oauth2/userinfo)
 * Follows OIDC standard claims format.
 */
export class UserInfoResponseDto {
  static name = 'Auth.UserInfoResponse';

  @ApiProperty({
    description: 'Subject identifier (user ID)',
    example: '123',
  })
  sub: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'Full name',
    example: 'John Doe',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Given name (first name)',
    example: 'John',
  })
  given_name?: string;

  @ApiPropertyOptional({
    description: 'Family name (last name)',
    example: 'Doe',
  })
  family_name?: string;
}
