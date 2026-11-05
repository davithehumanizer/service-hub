import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordResponseDto {
  static name = 'User.ResetPassword.Response';
  @ApiProperty({
    description: 'Success message',
    example: 'Password reset successfully',
  })
  message: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  email: string;
}
