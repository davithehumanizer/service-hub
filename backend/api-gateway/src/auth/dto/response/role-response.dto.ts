import { ApiProperty } from '@nestjs/swagger';

export class RoleResponseDto {
  static name = 'Auth.Role.Response';
  @ApiProperty({
    description: 'The unique identifier of the role',
    example: 'role-uuid-123',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'The name of the role',
    example: 'admin',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'List of permissions assigned to the role',
    example: ['user.create', 'user.read', 'user.update'],
    type: [String],
  })
  permissions: string[];

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-10-27T10:00:00Z',
    type: String,
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-10-27T10:00:00Z',
    type: String,
  })
  updatedAt: string;
}
