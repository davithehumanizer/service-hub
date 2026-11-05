import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class LinkPersonalDeviceDto {
  static name = 'RepairMonitor.LinkPersonalDevice';

  @ApiProperty({
    description: "One of the signed-in user's personal devices",
    example: 'b7f1c0de-1f2a-4c3b-9d4e-5f6a7b8c9d0e',
  })
  @IsUUID()
  ownershipId: string;
}
