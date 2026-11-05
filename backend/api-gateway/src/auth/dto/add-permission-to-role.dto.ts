import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AddPermissionToRoleDto {
  static name = 'Auth.Permission.AddToRole';
  @ApiProperty({
    description: 'The ID of the role',
    example: 'role-uuid-123',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({
    description: 'The permission to add to the role',
    example: 'user.create',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  permission: string;
}
