import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  IsArray,
  ArrayMaxSize,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum JourneyOutcomeDto {
  Fixed = 'Fixed',
  PartiallyFixed = 'PartiallyFixed',
  EndOfLife = 'EndOfLife',
}

export enum RepairBarrierDto {
  TooExpensive = 'TooExpensive',
  SparePartsUnavailable = 'SparePartsUnavailable',
  NoSkillsInfo = 'NoSkillsInfo',
  ProductDesign = 'ProductDesign',
  NoFaultFound = 'NoFaultFound',
  BeyondEconomicRepair = 'BeyondEconomicRepair',
  Other = 'Other',
}

export enum SolutionTagDto {
  PartReplacement = 'PartReplacement',
  Cleaning = 'Cleaning',
  Soldering = 'Soldering',
  SoftwareUpdate = 'SoftwareUpdate',
  Rewiring = 'Rewiring',
  Adjustment = 'Adjustment',
  Sewing = 'Sewing',
  Lubrication = 'Lubrication',
  Other = 'Other',
}

export class DeclareOutcomeDto {
  static name = 'RepairMonitor.DeclareOutcome';

  @ApiProperty({
    required: false,
    description:
      'The secret returned when the journey was recorded. Held by the browser. ' +
      'Optional only for a signed-in user who owns the journey; the service ' +
      'rejects the call when neither applies.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declarationToken?: string;

  @ApiProperty({
    enum: JourneyOutcomeDto,
    description:
      'What happened. "Still in progress" is not an outcome — it writes nothing and never reaches the server.',
  })
  @IsEnum(JourneyOutcomeDto)
  outcome: JourneyOutcomeDto;

  @ApiProperty({
    required: false,
    enum: RepairBarrierDto,
    description: 'What stopped the repair. Only meaningful when it failed.',
  })
  @IsOptional()
  @IsEnum(RepairBarrierDto)
  repairBarrier?: string;

  @ApiProperty({
    required: false,
    enum: SolutionTagDto,
    description: 'What was done. Only meaningful when it succeeded.',
  })
  @IsOptional()
  @IsEnum(SolutionTagDto)
  solutionTag?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  repairSolution?: string;

  @ApiProperty({ required: false, example: 2019 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1900)
  @Max(2100)
  yearOfManufacture?: number;
}

export class ClaimJourneysDto {
  static name = 'RepairMonitor.ClaimJourneys';

  @ApiProperty({
    type: [String],
    description: 'Declaration tokens this browser holds.',
  })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  tokens: string[];
}

export class LookupJourneysDto {
  static name = 'RepairMonitor.LookupJourneys';

  @ApiProperty({
    type: [String],
    required: false,
    description:
      'Declaration tokens this browser holds. Sent in the body, never the ' +
      'query string: they are secrets and must stay out of logs and history.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  tokens?: string[];
}
