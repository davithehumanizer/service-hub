import {
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsObject,
  ValidateNested,
  IsString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RoutePointDto {
  static name = 'FastPlanEco.Route.Point';
  @IsNotEmpty()
  lat: number;

  @IsNotEmpty()
  lng: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CalculateRouteDto {
  static name = 'FastPlanEco.Route.Calculate';
  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => RoutePointDto)
  baseAddress: RoutePointDto;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  followingAddresses: RoutePointDto[];

  @IsNotEmpty()
  @IsString()
  @IsEnum([
    'car',
    'electricCar',
    'utility',
    'electricUtility',
    'bike',
    'byFoot',
  ])
  vehicle:
    | 'car'
    | 'electricCar'
    | 'utility'
    | 'electricUtility'
    | 'bike'
    | 'byFoot';

  @IsOptional()
  @IsObject()
  additionalData?: Record<string, unknown>;
}
