import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class UpdateProfileResponseDto {
  static name = 'User.UpdateProfileResponse';
  @ApiProperty({
    description: 'Success message',
    example: 'Profile updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Updated user data',
    type: () => UserResponseDto,
  })
  user: UserResponseDto;
}
