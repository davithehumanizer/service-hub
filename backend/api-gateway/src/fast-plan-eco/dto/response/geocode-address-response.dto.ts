import { ApiProperty } from '@nestjs/swagger';

export class GeocodeAddressResponseDto {
  static name = 'FastPlanEco.Geocode.AddressResponse';
  @ApiProperty({
    description: 'Latitude des coordonnées géographiques',
    example: 48.8566,
    type: Number,
  })
  lat: number;

  @ApiProperty({
    description: 'Longitude des coordonnées géographiques',
    example: 2.3522,
    type: Number,
  })
  lng: number;

  @ApiProperty({
    description: 'Adresse formatée retournée par le service de géocodage',
    example: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
    type: String,
  })
  address: string;

  @ApiProperty({
    description: 'Code pays (ISO 3166-1 alpha-2)',
    example: 'US',
    type: String,
    required: false,
  })
  country?: string;

  @ApiProperty({
    description: 'Région ou état',
    example: 'California',
    type: String,
    required: false,
  })
  region?: string;

  @ApiProperty({
    description: 'Ville',
    example: 'Mountain View',
    type: String,
    required: false,
  })
  city?: string;

  @ApiProperty({
    description: 'Code postal',
    example: '94043',
    type: String,
    required: false,
  })
  postalCode?: string;
}
