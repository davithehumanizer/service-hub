import {
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsObject,
  ValidateNested,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GpxWaypointDto {
  static name = 'FastPlanEco.Export.GpxWaypoint';
  @IsNotEmpty()
  lat: number;

  @IsNotEmpty()
  lng: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ExportGpxDto {
  static name = 'FastPlanEco.Export.Gpx';
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GpxWaypointDto)
  waypoints: GpxWaypointDto[];

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  route?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  additionalData?: Record<string, unknown>;
}
