import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class ResetPasswordWithTokenDto {
  static name = 'User.ResetPassword.WithToken';
  @ApiProperty({
    description: 'New password',
    example: 'newsecurepassword',
  })
  @IsString()
  newPassword: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;
}
