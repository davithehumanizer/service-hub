import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsNotEmpty, ArrayNotEmpty } from 'class-validator';

export class CreateRoleDto {
  static name = 'Auth.Role.Create';
  @ApiProperty({
    description: 'The name of the role',
    example: 'admin',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'List of permissions for the role',
    example: ['user.create', 'user.read', 'user.update'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissions: string[];
}
