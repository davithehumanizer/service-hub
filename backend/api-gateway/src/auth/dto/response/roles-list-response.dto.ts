import { ApiProperty } from '@nestjs/swagger';
import { RoleResponseDto } from './role-response.dto';

export class RolesListResponseDto {
  static name = 'Auth.Role.ListResponse';
  @ApiProperty({
    description: 'List of roles',
    type: [RoleResponseDto],
  })
  roles: RoleResponseDto[];

  @ApiProperty({
    description: 'Total number of roles',
    example: 10,
    type: Number,
  })
  total: number;
}
