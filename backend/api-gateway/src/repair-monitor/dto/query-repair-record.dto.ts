import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryRepairRecordDto {
  static name = 'RepairMonitor.Query';

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({ required: false, example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({ required: false, example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({ required: false, example: 'BEL' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false, example: 'Electrical items' })
  @IsOptional()
  @IsString()
  productCategory?: string;

  @ApiProperty({ required: false, example: 'Nespresso' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ required: false, example: 'Fixed' })
  @IsOptional()
  @IsString()
  repairStatus?: string;
}
