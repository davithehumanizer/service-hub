import { IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class IfixitPaginationQueryDto {
  static name = 'External.Ifixit.Pagination';
  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
