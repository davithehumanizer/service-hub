import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional } from 'class-validator';

export class LoginDto {
  static name = 'Auth.Login';
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'reCAPTCHA token for bot protection',
    example: 'recaptcha_token_here',
    required: false,
  })
  @IsOptional()
  @IsString()
  recaptchaToken?: string;
}
