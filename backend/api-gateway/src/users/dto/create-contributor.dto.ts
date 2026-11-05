import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateContributorDto {
  static name = 'User.Contributor.Create';
  @ApiProperty({
    description: 'The address the invitation is sent to',
    example: 'saisie@entreprise.example',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Contact first name', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiProperty({ description: 'Contact last name', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({
    description: 'Language of the invitation email',
    enum: ['en', 'fr', 'nl', 'de'],
    default: 'en',
    required: false,
  })
  @IsOptional()
  @IsIn(['en', 'fr', 'nl', 'de'])
  locale?: string;
}
