import { IsOptional, IsString, IsNumber, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { RepairStatus } from '../enums/repair-status.enum';
import { RepairBarrier } from '../enums/repair-barrier.enum';
import { ProblemTag } from '../enums/problem-tag.enum';
import { SolutionTag } from '../enums/solution-tag.enum';

export class CreateRepairRecordDto {
  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  partnerProductCategory?: string;

  @IsOptional()
  @IsString()
  productCategory?: string;

  @IsOptional()
  @IsString()
  productCategoryId?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  modelType?: string;

  @IsOptional()
  @IsNumber()
  yearOfManufacture?: number;

  @IsOptional()
  @IsNumber()
  productAge?: number;

  @IsOptional()
  @IsString()
  problem?: string;

  @IsOptional()
  @IsEnum(ProblemTag)
  problemTag?: string;

  @IsOptional()
  @IsEnum(RepairStatus)
  repairStatus?: RepairStatus;

  @IsOptional()
  @IsEnum(RepairBarrier)
  repairBarrier?: string;

  @IsOptional()
  @IsString()
  repairSolution?: string;

  @IsOptional()
  @IsEnum(SolutionTag)
  solutionTag?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  repairFeasibility?: number;

  @IsOptional()
  @IsString()
  repairExplanation?: string;

  @IsOptional()
  @IsString()
  groupIdentifier?: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsString()
  dataProvider?: string;

  @IsOptional()
  @IsString()
  country?: string;
}
