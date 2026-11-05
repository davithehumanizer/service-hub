import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  ArrayMaxSize,
  MaxLength,
  IsInt,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { MAX_ID } from 'src/common/database-id';
import { Type } from 'class-transformer';

export enum RepairRouteDto {
  DoItYourself = 'DoItYourself',
  Professional = 'Professional',
  Recycle = 'Recycle',
  Reuse = 'Reuse',
}

export enum IssueSeverityDto {
  // Kept in step with repair-monitor-service's IssueSeverity: a value missing
  // here makes the journey's creation answer 400.
  Working = 'working',
  Partial = 'partial',
  Broken = 'broken',
}

export enum IssueDurationDto {
  JustHappened = 'just_happened',
  LessThanWeek = 'less_than_week',
  OneWeekToMonth = 'one_week_to_month',
  OneToSixMonths = 'one_to_six_months',
  MoreThanSixMonths = 'more_than_six_months',
}

export enum VisualConditionDto {
  Unknown = 'unknown',
  AsNew = 'as_new',
  Good = 'good',
  Fair = 'fair',
  Poor = 'poor',
}

export enum UsageIntensityDto {
  Unknown = 'unknown',
  HardlyUsed = 'hardly_used',
  Light = 'light',
  Moderate = 'moderate',
  Heavy = 'heavy',
}

export enum ProblemTagDto {
  Mechanical = 'MECHANICAL',
  PowerElectrical = 'POWER_ELECTRICAL',
  BehaviourSymptom = 'BEHAVIOUR_SYMPTOM',
  Maintenance = 'MAINTENANCE',
  Software = 'SOFTWARE',
  UserRelated = 'USER_RELATED',
  Battery = 'BATTERY',
  ControlElectronic = 'CONTROL_ELECTRONIC',
  NoneOther = 'NONE_OTHER',
}

/**
 * A completed wizard journey. Everything is optional — a journey is worth
 * recording even when the user skipped most of the steps.
 */
export class CreateRepairJourneyDto {
  static name = 'RepairMonitor.CreateJourney';

  @ApiProperty({ required: false, example: 42 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deviceId?: number;

  @ApiProperty({
    required: false,
    example: 877165,
    description:
      'The device model. Taken from the variant or the personal device when omitted.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_ID)
  modelId?: number;

  @ApiProperty({
    required: false,
    description:
      "One of the signed-in user's personal devices: the journey takes its model and variant, joins its repair history, and updates its current state.",
  })
  @IsOptional()
  @IsUUID()
  ownershipId?: string;

  @ApiProperty({ required: false, example: 'Bosch' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;

  @ApiProperty({ required: false, example: 'WAT28400FF' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  modelType?: string;

  @ApiProperty({ required: false, example: 'Washing machine' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  productCategory?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  productCategoryId?: string;

  @ApiProperty({
    required: false,
    description: 'Free text the user typed to describe the issue.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  problem?: string;

  @ApiProperty({
    required: false,
    type: [String],
    example: ['does_not_power_on'],
    description:
      'Symptom keys ticked in the wizard, never their translated labels.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  issues?: string[];

  @ApiProperty({ required: false, enum: ProblemTagDto })
  @IsOptional()
  @IsEnum(ProblemTagDto)
  problemTag?: string;

  @ApiProperty({
    required: false,
    enum: RepairRouteDto,
    description: 'The solution the user chose at the end of the wizard.',
  })
  @IsOptional()
  @IsEnum(RepairRouteDto)
  repairRoute?: string;

  @ApiProperty({ required: false, enum: IssueSeverityDto })
  @IsOptional()
  @IsEnum(IssueSeverityDto)
  issueSeverity?: string;

  @ApiProperty({ required: false, enum: IssueDurationDto })
  @IsOptional()
  @IsEnum(IssueDurationDto)
  issueDuration?: string;

  @ApiProperty({ required: false, enum: VisualConditionDto })
  @IsOptional()
  @IsEnum(VisualConditionDto)
  visualCondition?: string;

  @ApiProperty({ required: false, enum: UsageIntensityDto })
  @IsOptional()
  @IsEnum(UsageIntensityDto)
  usageIntensity?: string;

  @ApiProperty({ required: false, example: 3.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedAge?: number;

  @ApiProperty({ required: false, example: 'fr' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiProperty({ required: false, example: 'France' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  country?: string;
}
