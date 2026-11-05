import { ApiProperty } from '@nestjs/swagger';

export class AddPermissionResponseDto {
  static name = 'Auth.Permission.AddResponse';
  @ApiProperty({
    description: 'Success message',
    example: 'Permission added to role successfully',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'The role ID',
    example: 'role-uuid-123',
    type: String,
  })
  roleId: string;

  @ApiProperty({
    description: 'The permission that was added',
    example: 'user.create',
    type: String,
  })
  permission: string;
}
