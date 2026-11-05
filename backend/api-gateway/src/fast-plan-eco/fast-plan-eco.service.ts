import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { GeocodeAddressDto } from './dto/geocode-address.dto';
import { CalculateRouteDto } from './dto/calculate-route.dto';
import { ExportGpxDto } from './dto/export-gpx.dto';
import { ExportGoogleMapsDto } from './dto/export-googlemaps.dto';

@Injectable()
export class FastPlanEcoService {
  private readonly fastPlanEcoServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('FAST_PLAN_ECO_SERVICE_HOST');
    const port = this.configService.get<string>('FAST_PLAN_ECO_SERVICE_PORT');
    this.fastPlanEcoServiceUrl = `http://${host}:${port}`;
  }

  // Example method to proxy a geocode-address request
  geocodeAddress(
    address: GeocodeAddressDto,
  ): Observable<AxiosResponse<unknown>> {
    return this.httpService.post(
      `${this.fastPlanEcoServiceUrl}/api/geocode-address`,
      address,
    );
  }

  // Example method to proxy a calculate-route request
  calculateRoute(
    routeData: CalculateRouteDto,
  ): Observable<AxiosResponse<unknown>> {
    return this.httpService.post(
      `${this.fastPlanEcoServiceUrl}/api/calculate-route`,
      routeData,
    );
  }

  // Example method to proxy an export-gpx request
  exportGpx(gpxData: ExportGpxDto): Observable<AxiosResponse<unknown>> {
    return this.httpService.post(
      `${this.fastPlanEcoServiceUrl}/api/export-gpx`,
      gpxData,
    );
  }

  // Example method to proxy an export-googlemaps request
  exportGoogleMaps(
    googleMapsData: ExportGoogleMapsDto,
  ): Observable<AxiosResponse<unknown>> {
    return this.httpService.post(
      `${this.fastPlanEcoServiceUrl}/api/export-googlemaps`,
      googleMapsData,
    );
  }
}
