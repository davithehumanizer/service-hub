import { ApiProperty } from '@nestjs/swagger';

export class PermissionResponseDto {
  static name = 'Auth.Permission.Response';
  @ApiProperty({
    description: 'Permission ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Permission name',
    example: 'permission.create',
  })
  name: string;

  @ApiProperty({
    description: 'Permission creation date',
    example: '2025-10-27T10:00:00.000Z',
  })
  createdAt: string;
}
