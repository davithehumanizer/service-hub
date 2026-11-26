import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

/** A page of what an account entered. */
export class ContributionsQueryDto {
  @ApiProperty({ enum: ['models', 'variants'] })
  @IsIn(['models', 'variants'])
  kind: 'models' | 'variants';

  @ApiProperty({ required: false, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

/** The same, for an administrator, who also sees a contributor's repairers. */
export class ContributorEntriesQueryDto {
  @ApiProperty({ enum: ['models', 'variants', 'repairers'] })
  @IsIn(['models', 'variants', 'repairers'])
  kind: 'models' | 'variants' | 'repairers';

  @ApiProperty({ required: false, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class ContributionsPageDto {
  @ApiProperty({
    description:
      'Models: id, brand, name, is_demo, created_at, variant_count. ' +
      'Variants: id, model_id, brand, model_name, variant_label, ean, is_demo. ' +
      'Repairers: as on "My repairers", each with its waiting or refused change.',
    type: 'array',
    items: { type: 'object' },
  })
  items: Record<string, unknown>[];

  @ApiProperty({ description: 'How many there are in all.' })
  total: number;
}
