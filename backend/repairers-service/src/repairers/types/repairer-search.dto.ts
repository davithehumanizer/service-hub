import { IsOptional, IsString, IsNumber } from 'class-validator';

export class RepairerSearchDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  filters?: { [key: string]: string }; // Changed to a plain object

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
