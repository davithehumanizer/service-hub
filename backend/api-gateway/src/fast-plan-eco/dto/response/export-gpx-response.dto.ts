import { ApiProperty } from '@nestjs/swagger';

export class ExportGpxResponseDto {
  static name = 'FastPlanEco.Export.GpxResponse';
  @ApiProperty({
    description: 'Contenu du fichier GPX au format XML',
    example:
      '<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="FastPlanEco"><trk><name>Parcours Paris Centre</name><trkseg><trkpt lat="48.8566" lon="2.3522"><name>Tour Eiffel</name></trkpt><trkpt lat="48.8584" lon="2.2945"><name>Arc de Triomphe</name></trkpt></trkseg></trk></gpx>',
    type: String,
    format: 'xml',
  })
  gpxContent: string;

  @ApiProperty({
    description: 'Nom du fichier GPX généré',
    example: 'parcours-paris-centre.gpx',
    type: String,
    required: false,
  })
  filename?: string;

  @ApiProperty({
    description: 'Nombre de points de passage dans le fichier',
    example: 5,
    type: Number,
    required: false,
  })
  waypointCount?: number;

  @ApiProperty({
    description: 'Version GPX utilisée',
    example: '1.1',
    type: String,
    required: false,
  })
  version?: string;
}
