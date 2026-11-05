import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class GeocodeAddressDto {
  static name = 'FastPlanEco.Geocode.Address';
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsObject()
  additionalData?: Record<string, unknown>;
}
