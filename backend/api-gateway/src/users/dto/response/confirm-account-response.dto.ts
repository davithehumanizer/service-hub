import { ApiProperty } from '@nestjs/swagger';

export class ConfirmAccountResponseDto {
  static name = 'User.ConfirmAccountResponse';
  @ApiProperty({
    description: 'Success message',
    example: 'Account confirmed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  email: string;
}
