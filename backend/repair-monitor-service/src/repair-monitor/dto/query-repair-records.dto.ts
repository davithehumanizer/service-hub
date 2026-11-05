import { IsOptional, IsString, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RepairStatus } from '../enums/repair-status.enum';

export class QueryRepairRecordsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  productCategory?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsEnum(RepairStatus)
  repairStatus?: RepairStatus;
}
