import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  DeviceModelDto,
  DeviceModelVariantDto,
} from 'src/devices/dto/device-model.dto';
import { MAX_ID } from 'src/common/database-id';

// Absent, or a value: @IsOptional() would let null through as well, and
// store 1970-01-01 for a date or erase a model.
const Optional = () => ValidateIf((_, value) => value !== undefined);

// The values the wizard captures, which a journey passes on.
export const VISUAL_CONDITIONS = [
  'unknown',
  'as_new',
  'good',
  'fair',
  'poor',
] as const;
export const USAGE_INTENSITIES = [
  'unknown',
  'hardly_used',
  'light',
  'moderate',
  'heavy',
] as const;

export class CreatePersonalDeviceDto {
  static name = 'PersonalDevice.Create';

  @ApiPropertyOptional({
    description: 'The device model. Taken from the variant when omitted.',
    example: 877165,
  })
  @Optional()
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  modelId?: number;

  @ApiPropertyOptional({
    description:
      'The variant, the catalogue entry, when known: it must be one of the model.',
    example: 724390,
  })
  @Optional()
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  deviceId?: number;

  @ApiPropertyOptional({
    description: 'Tells two identical devices apart',
    example: "Léa's phone",
  })
  @Optional()
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @ApiPropertyOptional({ enum: VISUAL_CONDITIONS, example: 'good' })
  @Optional()
  @IsIn(VISUAL_CONDITIONS)
  visualCondition?: string;

  @ApiPropertyOptional({ enum: USAGE_INTENSITIES, example: 'moderate' })
  @Optional()
  @IsIn(USAGE_INTENSITIES)
  usageIntensity?: string;

  @ApiPropertyOptional({
    description: 'When it was acquired, roughly: today when omitted',
    example: '2023-06-01',
  })
  @Optional()
  @IsDateString()
  acquiredAt?: string;

  @ApiPropertyOptional({
    description:
      'A second device of a model the user already has: refused (409) unless asked for',
    example: false,
  })
  @Optional()
  @IsBoolean()
  another?: boolean;
}

export class UpdatePersonalDeviceDto {
  static name = 'PersonalDevice.Update';

  @ApiPropertyOptional({
    description:
      'Another model: the variant goes unless one of the new model is given',
  })
  @Optional()
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  modelId?: number;

  @ApiPropertyOptional({
    description: 'The variant, or null to forget it',
    nullable: true,
    type: Number,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  deviceId?: number | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(100)
  nickname?: string | null;

  @ApiPropertyOptional({ enum: VISUAL_CONDITIONS })
  @Optional()
  @IsIn(VISUAL_CONDITIONS)
  visualCondition?: string;

  @ApiPropertyOptional({ enum: USAGE_INTENSITIES })
  @Optional()
  @IsIn(USAGE_INTENSITIES)
  usageIntensity?: string;

  @ApiPropertyOptional({ example: '2023-06-01' })
  @Optional()
  @IsDateString()
  acquiredAt?: string;
}

export class PersonalDeviceDto {
  static name = 'PersonalDevice.Device';

  @ApiProperty({ example: 'b7f1c0de-1f2a-4c3b-9d4e-5f6a7b8c9d0e' })
  id: string;

  @ApiProperty({ example: 42 })
  userId: number;

  @ApiProperty({ example: 877165 })
  modelId: number;

  @ApiProperty({ nullable: true, type: Number, example: 724390 })
  deviceId: number | null;

  @ApiProperty({ nullable: true, type: String, example: "Léa's phone" })
  nickname: string | null;

  @ApiProperty({ enum: VISUAL_CONDITIONS })
  visualCondition: string;

  @ApiProperty({ enum: USAGE_INTENSITIES })
  usageIntensity: string;

  @ApiProperty({ example: '2023-06-01T00:00:00.000Z' })
  acquiredAt: string;

  @ApiProperty({
    type: DeviceModelDto,
    nullable: true,
    description: 'The model, null if it no longer exists',
  })
  model: DeviceModelDto | null;

  @ApiProperty({
    type: DeviceModelVariantDto,
    nullable: true,
    description: 'The variant, null when not known or no longer existing',
  })
  variant: DeviceModelVariantDto | null;
}
