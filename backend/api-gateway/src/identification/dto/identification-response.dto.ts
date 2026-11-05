import { ApiProperty } from '@nestjs/swagger';
import { IdentificationResultDto } from './identification-result.dto';

export class IdentificationResponseDto {
  static name = 'Identification.Response';

  @ApiProperty({
    description: 'Indicates if the identification was successful',
  })
  success: boolean;

  @ApiProperty({
    type: IdentificationResultDto,
    nullable: true,
    description: 'The identified product data',
  })
  data: IdentificationResultDto | null;

  @ApiProperty({ description: 'Error message if failed', required: false })
  error?: string;

  @ApiProperty({
    description:
      'True when the image was analyzed but contained no recognizable device',
    required: false,
  })
  notFound?: boolean;

  @ApiProperty({ description: 'Timestamp of the processing' })
  timestamp: string;

  @ApiProperty({
    description: 'Public URL of the uploaded image in storage',
    required: false,
  })
  imageUrl?: string;
}
