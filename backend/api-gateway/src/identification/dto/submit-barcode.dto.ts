import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class SubmitBarcodeDto {
  static name = 'Identification.Barcode';

  @ApiProperty({
    description: 'The scanned barcode: EAN-8, EAN-13, UPC-A or GTIN-14',
    example: '4242002898537',
  })
  @Matches(/^\d{8}$|^\d{12,14}$/, {
    message: 'barcode must be 8, 12, 13 or 14 digits',
  })
  code: string;
}
