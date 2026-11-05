import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePermissionDto {
  static name = 'Auth.Permission.Create';
  @ApiProperty({
    description: 'Permission name',
    example: 'permission.create',
  })
  @IsString()
  name: string;
}
