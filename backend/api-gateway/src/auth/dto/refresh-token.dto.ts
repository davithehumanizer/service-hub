import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  static name = 'Auth.RefreshToken';

  @ApiProperty({
    description:
      'Opaque refresh token issued at login. Single-use: a new one is returned on every exchange.',
    example: 'k7Qb1s_9k0Zc...',
  })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
