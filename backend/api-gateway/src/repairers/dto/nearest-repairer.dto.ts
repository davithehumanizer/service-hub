import { ApiProperty } from '@nestjs/swagger';
import { RepairerDto } from './repairer.dto';
import { ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class NearestRepairerDto {
  static name = 'Repairer.Nearest';
  @ApiProperty({ type: RepairerDto })
  @ValidateNested()
  @Type(() => RepairerDto)
  repairer: RepairerDto;

  @ApiProperty({ description: 'Distance to the repairer in meters' })
  @IsNumber()
  distance: number;
}
