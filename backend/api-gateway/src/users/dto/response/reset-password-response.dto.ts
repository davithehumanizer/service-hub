import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordResponseDto {
  static name = 'User.ResetPassword.Response';
  @ApiProperty({
    description: 'Success message',
    example: 'Password reset successfully',
  })
  message: string;

  @ApiProperty({
    description:
      'Whether the email with the link left. When false a new request can be made later.',
    example: true,
  })
  emailSent: boolean;
}
