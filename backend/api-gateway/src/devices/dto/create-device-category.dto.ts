import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDeviceCategoryDto {
  static name = 'Device.Category.Create';
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}
