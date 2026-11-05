import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class ResetPasswordDto {
  static name = 'User.ResetPassword';
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'New password',
    example: 'newsecurepassword',
  })
  @IsString()
  newPassword: string;

  @ApiProperty({
    description: 'Reset password token',
    example: 'abc123token',
  })
  @IsString()
  resetToken: string;
}
