import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class IssueTagClassifyRequestDto {
  static name = 'IssueTag.ClassifyRequest';

  @ApiProperty({
    description:
      'Device name followed by a description of the issue. E.g. "Printer paper transport broken".',
    example: 'Coffee machine does turn on but does not heat',
  })
  @IsString()
  @IsNotEmpty()
  input: string;
}
