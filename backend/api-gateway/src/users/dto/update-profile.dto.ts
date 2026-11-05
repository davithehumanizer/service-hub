import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * What a user may change on their own profile. The profile was taken as any
 * object and copied onto the stored one: an `id` in it would have saved the
 * fields onto another user's profile. Anything not listed here is stripped by
 * the global ValidationPipe.
 */
export class ProfileFieldsDto {
  static name = 'User.ProfileFields';

  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Smith' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: '+32 470 00 00 00' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ example: 'Rue de la Loi 16' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: 'Brussels' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Belgium' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;
}

export class UpdateProfileDto {
  static name = 'User.UpdateProfile';
  @ApiProperty({
    description: 'User profile fields to update; any other is dropped',
    type: ProfileFieldsDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ProfileFieldsDto)
  profile: ProfileFieldsDto;
}
