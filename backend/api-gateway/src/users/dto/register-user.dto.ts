import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
} from 'class-validator';

export class RegisterUserDto {
  static name = 'User.Register';
  @ApiProperty({
    description: 'User email address',
    example: 'newuser@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'securepassword',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'Account type: customer (standard user) or repairer',
    enum: ['customer', 'repairer'],
    default: 'customer',
    required: false,
  })
  @IsOptional()
  @IsEnum(['customer', 'repairer'])
  userType?: 'customer' | 'repairer';

  @ApiProperty({
    description: 'User profile data',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  profile?: Record<string, any>;

  @ApiProperty({
    description: 'reCAPTCHA v3 token',
    required: false,
  })
  @IsOptional()
  @IsString()
  recaptchaToken?: string;
}
