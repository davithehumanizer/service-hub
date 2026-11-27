import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class ContributorCreatedResponseDto extends UserResponseDto {
  static name = 'User.Contributor.Created';
  @ApiProperty({
    description:
      'Whether the invitation email left. When false the account exists all the same, and “Forgot password” sends a new link once email works again.',
    example: true,
  })
  invitationSent: boolean;
}
