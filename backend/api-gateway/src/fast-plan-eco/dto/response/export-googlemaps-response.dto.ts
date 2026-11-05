import { ApiProperty } from '@nestjs/swagger';

export class GoogleMapsWaypointDto {
  static name = 'FastPlanEco.Export.GoogleMapsWaypoint';
  @ApiProperty({
    description: 'Latitude du point de passage',
    example: 48.8566,
    type: Number,
  })
  lat: number;

  @ApiProperty({
    description: 'Longitude du point de passage',
    example: 2.3522,
    type: Number,
  })
  lng: number;

  @ApiProperty({
    description: 'Adresse du point de passage',
    example: 'Tour Eiffel, Paris, France',
    type: String,
    required: false,
  })
  address?: string;
}

export class ExportGoogleMapsResponseDto {
  static name = 'FastPlanEco.Export.GoogleMapsResponse';
  @ApiProperty({
    description: "URL Google Maps avec l'itinéraire ou les points d'intérêt",
    example:
      'https://www.google.com/maps/dir/48.8566,2.3522/48.8584,2.2945/@48.8575,2.32335,14z/data=!3m1!4b1!4m2!4m1!3e0',
    type: String,
  })
  url: string;

  @ApiProperty({
    description: 'Liste des points de passage utilisés',
    type: [GoogleMapsWaypointDto],
  })
  waypoints: GoogleMapsWaypointDto[];

  @ApiProperty({
    description: 'Mode de transport utilisé',
    example: 'driving',
    enum: ['driving', 'walking', 'bicycling', 'transit'],
    required: false,
  })
  mode?: string;

  @ApiProperty({
    description: 'Adresse du point de départ',
    example: 'Tour Eiffel, Paris',
    type: String,
    required: false,
  })
  origin?: string;

  @ApiProperty({
    description: "Adresse du point d'arrivée",
    example: 'Arc de Triomphe, Paris',
    type: String,
    required: false,
  })
  destination?: string;

  @ApiProperty({
    description: 'Paramètres supplémentaires pour Google Maps',
    example: { avoid: 'tolls', units: 'metric' },
    type: Object,
    required: false,
  })
  options?: Record<string, any>;
}
