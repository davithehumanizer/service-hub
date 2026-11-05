import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { ProblemTag } from '../enums/problem-tag.enum';
import { RepairRoute } from '../enums/repair-route.enum';
import { IssueSeverity } from '../enums/issue-severity.enum';
import { IssueDuration } from '../enums/issue-duration.enum';
import { VisualCondition } from '../enums/visual-condition.enum';
import { UsageIntensity } from '../enums/usage-intensity.enum';

/**
 * What the wizard knows at the end of a journey. Everything is optional: a
 * journey is worth recording even when the user skipped most steps.
 */
export class CreateRepairJourneyDto {
  @IsOptional()
  @IsNumber()
  deviceId?: number;

  /** The device model, which the gateway checked against the variant. */
  @IsOptional()
  @IsNumber()
  modelId?: number;

  /** The owner's personal device, which the gateway checked is theirs. */
  @IsOptional()
  @IsString()
  ownershipId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  modelType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  productCategory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  productCategoryId?: string;

  // Free text the user typed. Capped so the column cannot be used as storage.
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  problem?: string;

  /** Symptom keys ticked in the wizard, never their translated labels. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  issues?: string[];

  @IsOptional()
  @IsEnum(ProblemTag)
  problemTag?: string;

  @IsOptional()
  @IsEnum(RepairRoute)
  repairRoute?: string;

  @IsOptional()
  @IsEnum(IssueSeverity)
  issueSeverity?: string;

  @IsOptional()
  @IsEnum(IssueDuration)
  issueDuration?: string;

  @IsOptional()
  @IsEnum(VisualCondition)
  visualCondition?: string;

  @IsOptional()
  @IsEnum(UsageIntensity)
  usageIntensity?: string;

  @IsOptional()
  @IsNumber()
  estimatedAge?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  country?: string;
}
