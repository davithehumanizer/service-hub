import { ApiProperty } from '@nestjs/swagger';

export class ExternalAdapterResponseDto {
  static name = 'External.AdapterResponse';
  @ApiProperty({
    description: 'Success status of the external API call',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response data from the external service',
    example: {},
  })
  data: unknown;

  @ApiProperty({
    description: 'Error message if the call failed',
    example: null,
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: 'Timestamp of the response',
    example: '2025-10-27T14:30:00.000Z',
  })
  timestamp: string;
}
