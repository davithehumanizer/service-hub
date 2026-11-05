import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FixometerImpactMetricsQueryDto {
  static name = 'External.Fixometer.ImpactMetrics';
  @ApiProperty({
    description:
      'Device category. Must match a category the platform knows; the ' +
      'reference data gives CO2e per category, so this is the whole input.',
    example: 'Laptop',
  })
  @IsString()
  deviceType: string;

  @ApiProperty({
    required: false,
    deprecated: true,
    description:
      'Ignored. The impact is now read from per-category reference data ' +
      'rather than computed from mass. Still accepted so existing callers ' +
      'do not break.',
    example: 2.5,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  weight?: number;
}
