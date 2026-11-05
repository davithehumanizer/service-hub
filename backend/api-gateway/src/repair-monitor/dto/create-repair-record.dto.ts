import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum RepairStatusDto {
  Fixed = 'Fixed',
  PartiallyFixed = 'PartiallyFixed',
  Repairable = 'Repairable',
  EndOfLife = 'EndOfLife',
  Unknown = 'Unknown',
  Other = 'Other',
}

export class CreateRepairRecordDto {
  static name = 'RepairMonitor.Create';

  @ApiProperty({ required: false, example: 'Nespresso' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ required: false, example: 'Vertuo Plus' })
  @IsOptional()
  @IsString()
  modelType?: string;

  @ApiProperty({ required: false, example: 'Electrical items' })
  @IsOptional()
  @IsString()
  productCategory?: string;

  @ApiProperty({ required: false, example: 'cat-001' })
  @IsOptional()
  @IsString()
  productCategoryId?: string;

  @ApiProperty({ required: false, example: 'Électroménager' })
  @IsOptional()
  @IsString()
  partnerProductCategory?: string;

  @ApiProperty({ required: false, example: 2019 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  yearOfManufacture?: number;

  @ApiProperty({ required: false, example: 3.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  productAge?: number;

  @ApiProperty({
    required: false,
    example: 'Device does not power on after a drop.',
  })
  @IsOptional()
  @IsString()
  problem?: string;

  @ApiProperty({ required: false, example: 'PowerIssue' })
  @IsOptional()
  @IsString()
  problemTag?: string;

  @ApiProperty({ required: false, enum: RepairStatusDto })
  @IsOptional()
  @IsEnum(RepairStatusDto)
  repairStatus?: string;

  @ApiProperty({ required: false, example: 'TooExpensive' })
  @IsOptional()
  @IsString()
  repairBarrier?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  repairSolution?: string;

  @ApiProperty({ required: false, example: 'PartReplacement' })
  @IsOptional()
  @IsString()
  solutionTag?: string;

  @ApiProperty({ required: false, example: 7.5, minimum: 0, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  repairFeasibility?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  repairExplanation?: string;

  @ApiProperty({ required: false, example: 'repair-cafe-brussels-42' })
  @IsOptional()
  @IsString()
  groupIdentifier?: string;

  @ApiProperty({ required: false, example: '2026-05-10' })
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @ApiProperty({ required: false, example: 'Repair Café Brussels' })
  @IsOptional()
  @IsString()
  dataProvider?: string;

  @ApiProperty({ required: false, example: 'BEL' })
  @IsOptional()
  @IsString()
  country?: string;
}
