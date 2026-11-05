import {
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsObject,
  ValidateNested,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GoogleMapsWaypointDto {
  static name = 'FastPlanEco.Export.GoogleMapsWaypoint';
  @IsNotEmpty()
  lat: number;

  @IsNotEmpty()
  lng: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ExportGoogleMapsDto {
  static name = 'FastPlanEco.Export.GoogleMaps';
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoogleMapsWaypointDto)
  waypoints: GoogleMapsWaypointDto[];

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsObject()
  route?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  additionalData?: Record<string, unknown>;
}
