import { ApiProperty } from '@nestjs/swagger';
import { PermissionResponseDto } from './permission-response.dto';

export class PermissionsListResponseDto {
  static name = 'Auth.Permission.ListResponse';
  @ApiProperty({
    description: 'List of permissions',
    type: [PermissionResponseDto],
  })
  permissions: PermissionResponseDto[];

  @ApiProperty({
    description: 'Total number of permissions',
    example: 5,
  })
  total: number;
}
