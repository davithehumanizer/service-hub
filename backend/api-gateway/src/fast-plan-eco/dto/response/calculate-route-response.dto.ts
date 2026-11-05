import { ApiProperty } from '@nestjs/swagger';

export class RouteWaypointDto {
  static name = 'FastPlanEco.Route.Waypoint';
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
    description: 'Nom du point de passage',
    example: 'Tour Eiffel',
    type: String,
    required: false,
  })
  name?: string;
}

export class CalculateRouteResponseDto {
  static name = 'FastPlanEco.Route.CalculateResponse';
  @ApiProperty({
    description: "Distance totale de l'itinéraire en mètres",
    example: 5420,
    type: Number,
  })
  distance: number;

  @ApiProperty({
    description: "Durée totale de l'itinéraire en secondes",
    example: 1800,
    type: Number,
  })
  duration: number;

  @ApiProperty({
    description: "Géométrie de l'itinéraire au format GeoJSON (LineString)",
    example:
      '{"type":"LineString","coordinates":[[2.3522,48.8566],[2.2945,48.8584]]}',
    type: String,
  })
  geometry: string;

  @ApiProperty({
    description: 'Liste des points de passage optimisés',
    type: [RouteWaypointDto],
  })
  waypoints: RouteWaypointDto[];

  @ApiProperty({
    description: 'Instructions de navigation détaillées',
    example: [
      'Tournez à droite sur Avenue des Champs-Élysées',
      'Continuez tout droit',
    ],
    type: [String],
    required: false,
  })
  instructions?: string[];

  @ApiProperty({
    description: 'Profil de routage utilisé',
    example: 'driving',
    enum: ['driving', 'walking', 'cycling'],
    required: false,
  })
  profile?: string;
}
