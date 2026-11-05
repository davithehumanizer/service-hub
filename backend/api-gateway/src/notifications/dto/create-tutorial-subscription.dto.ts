import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsArray,
  IsIn,
  IsInt,
  Max,
  Min,
} from 'class-validator';
import { MAX_ID } from 'src/common/database-id';

const SUPPORTED_LOCALES = ['en', 'fr', 'nl', 'de'];

export class CreateTutorialSubscriptionDto {
  static name = 'Notification.CreateTutorialSubscription';

  @ApiProperty({
    description: 'Email address to notify when a tutorial becomes available',
    example: 'user@example.com',
    type: String,
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description:
      'The device model the user waits a tutorial for, tutorials being written per model. Taken from a numeric deviceId when omitted.',
    example: 877165,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  modelId?: number;

  @ApiPropertyOptional({
    description: 'The device ID the user is looking for a tutorial for',
    example: 'device-uuid-123',
    type: String,
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    description: 'The issue types selected by the user in the repair wizard',
    example: ['screen_broken', 'battery'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  issueTypes?: string[];

  @ApiProperty({
    description: 'Locale used to generate the confirmation email content',
    example: 'fr',
    enum: SUPPORTED_LOCALES,
  })
  @IsIn(SUPPORTED_LOCALES)
  locale: string;
}
