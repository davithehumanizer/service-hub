import { ApiProperty } from '@nestjs/swagger';

export class CreateTutorialSubscriptionResponseDto {
  static name = 'Notification.CreateTutorialSubscriptionResponse';

  @ApiProperty({
    description: 'Whether the subscription was successfully created',
    example: true,
    type: Boolean,
  })
  success: boolean;
}
