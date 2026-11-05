import { Controller, Post, Body, Version, Logger } from '@nestjs/common';
import { FastPlanEcoService } from './fast-plan-eco.service';
import { map, tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { GeocodeAddressDto } from './dto/geocode-address.dto';
import { CalculateRouteDto } from './dto/calculate-route.dto';
import { ExportGpxDto } from './dto/export-gpx.dto';
import { ExportGoogleMapsDto } from './dto/export-googlemaps.dto';
import { GeocodeAddressResponseDto } from './dto/response/geocode-address-response.dto';
import { CalculateRouteResponseDto } from './dto/response/calculate-route-response.dto';
import { ExportGpxResponseDto } from './dto/response/export-gpx-response.dto';
import { ExportGoogleMapsResponseDto } from './dto/response/export-googlemaps-response.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Fast Plan Eco')
@Controller('fast-plan-eco')
export class FastPlanEcoController {
  private readonly logger = new Logger(FastPlanEcoController.name);

  constructor(private readonly fastPlanEcoService: FastPlanEcoService) {}

  @Version('1')
  @Post('geocode-address')
  @ApiOperation({
    summary: 'Geocode an address',
    description:
      'Converts a textual address to geographic coordinates (latitude/longitude) using the FastPlanEco service.',
  })
  @ApiBody({
    type: GeocodeAddressDto,
    description: 'Address data to geocode',
    examples: {
      'Simple address': {
        summary: 'Simple address',
        value: {
          address: '1600 Amphitheatre Parkway, Mountain View, CA',
        },
      },
      'Address with country and region': {
        summary: 'Address with metadata',
        value: {
          address: '10 Downing Street, London',
          country: 'GB',
          region: 'England',
          additionalData: {
            language: 'en',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Address geocoded successfully',
    type: GeocodeAddressResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 500,
    description: 'Geocoding service error',
  })
  geocodeAddress(@Body() address: GeocodeAddressDto) {
    const startTime = Date.now();
    this.logger.log('Geocode address requested', {
      event: 'fast_plan_geocode_request',
      category: 'fast_plan_eco',
    });
    return this.fastPlanEcoService.geocodeAddress(address).pipe(
      tap(() =>
        this.logger.log('Geocode address succeeded', {
          event: 'fast_plan_geocode_success',
          category: 'fast_plan_eco',
          duration_ms: Date.now() - startTime,
        }),
      ),
      map((response) => response.data),
      catchError((error: Error) => {
        this.logger.error('Geocode address failed', {
          event: 'fast_plan_geocode_failure',
          category: 'fast_plan_eco',
          duration_ms: Date.now() - startTime,
          error_message: error.message,
        });
        return throwError(() => error);
      }),
    );
  }

  @Version('1')
  @Post('calculate-route')
  @ApiOperation({
    summary: 'Calculate a route',
    description:
      'Calculates an optimized route between multiple waypoints using the FastPlanEco service.',
  })
  @ApiBody({
    type: CalculateRouteDto,
    description: 'Route calculation data',
    examples: {
      'Simple route': {
        summary: 'Route with 2 points',
        value: {
          baseAddress: { lat: 48.8566, lng: 2.3522 },
          followingAddresses: [{ lat: 48.8584, lng: 2.2945 }],
          vehicle: 'car',
        },
      },
      'Route with multiple stops': {
        summary: 'Route with multiple stops',
        value: {
          baseAddress: {
            lat: 48.8566,
            lng: 2.3522,
            metadata: { name: 'Start' },
          },
          followingAddresses: [
            {
              lat: 48.8584,
              lng: 2.2945,
              metadata: { name: 'Arc de Triomphe' },
            },
            {
              lat: 48.8606,
              lng: 2.3376,
              metadata: { name: 'Louvre Museum' },
            },
          ],
          vehicle: 'electricCar',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Route calculated successfully',
    type: CalculateRouteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 500,
    description: 'Route calculation service error',
  })
  calculateRoute(@Body() routeData: CalculateRouteDto) {
    const startTime = Date.now();
    this.logger.log('Route calculation requested', {
      event: 'fast_plan_route_request',
      category: 'fast_plan_eco',
    });
    return this.fastPlanEcoService.calculateRoute(routeData).pipe(
      tap(() =>
        this.logger.log('Route calculation succeeded', {
          event: 'fast_plan_route_success',
          category: 'fast_plan_eco',
          duration_ms: Date.now() - startTime,
        }),
      ),
      map((response) => response.data),
      catchError((error: Error) => {
        this.logger.error('Route calculation failed', {
          event: 'fast_plan_route_failure',
          category: 'fast_plan_eco',
          duration_ms: Date.now() - startTime,
          error_message: error.message,
        });
        return throwError(() => error);
      }),
    );
  }

  @Version('1')
  @Post('export-gpx')
  @ApiOperation({
    summary: 'Export to GPX format',
    description:
      'Exports a route or waypoints to GPX (GPS Exchange Format) for use in GPS applications.',
  })
  @ApiBody({
    type: ExportGpxDto,
    description: 'GPX export data',
    examples: {
      'Simple export': {
        summary: 'Export waypoints',
        value: {
          waypoints: [
            { lat: 48.8566, lng: 2.3522, name: 'Eiffel Tower' },
            { lat: 48.8584, lng: 2.2945, name: 'Arc de Triomphe' },
          ],
        },
      },
      'Export with metadata': {
        summary: 'Export with name and description',
        value: {
          waypoints: [
            {
              lat: 48.8566,
              lng: 2.3522,
              name: 'Start',
              metadata: { elevation: 35 },
            },
            {
              lat: 48.8584,
              lng: 2.2945,
              name: 'End',
              metadata: { elevation: 50 },
            },
          ],
          name: 'Paris Center Route',
          description: 'Visit Paris monuments',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'GPX file generated successfully',
    type: ExportGpxResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 500,
    description: 'Error generating GPX file',
  })
  exportGpx(@Body() gpxData: ExportGpxDto) {
    const startTime = Date.now();
    this.logger.log('GPX export requested', {
      event: 'fast_plan_gpx_request',
      category: 'fast_plan_eco',
    });
    return this.fastPlanEcoService.exportGpx(gpxData).pipe(
      tap(() =>
        this.logger.log('GPX export succeeded', {
          event: 'fast_plan_gpx_success',
          category: 'fast_plan_eco',
          duration_ms: Date.now() - startTime,
        }),
      ),
      map((response) => response.data),
      catchError((error: Error) => {
        this.logger.error('GPX export failed', {
          event: 'fast_plan_gpx_failure',
          category: 'fast_plan_eco',
          duration_ms: Date.now() - startTime,
          error_message: error.message,
        });
        return throwError(() => error);
      }),
    );
  }

  @Version('1')
  @Post('export-googlemaps')
  @ApiOperation({
    summary: 'Export to Google Maps',
    description:
      'Generates a link or data compatible with Google Maps to display a route or points of interest.',
  })
  @ApiBody({
    type: ExportGoogleMapsDto,
    description: 'Google Maps export data',
    examples: {
      'Simple export': {
        summary: 'Export points for Google Maps',
        value: {
          waypoints: [
            { lat: 48.8566, lng: 2.3522, address: 'Eiffel Tower, Paris' },
            { lat: 48.8584, lng: 2.2945, address: 'Arc de Triomphe, Paris' },
          ],
        },
      },
      'Export with transport mode': {
        summary: 'Export with navigation parameters',
        value: {
          waypoints: [
            { lat: 48.8566, lng: 2.3522, address: 'Eiffel Tower' },
            { lat: 48.8584, lng: 2.2945, address: 'Arc de Triomphe' },
          ],
          mode: 'driving',
          origin: 'Eiffel Tower, Paris',
          destination: 'Arc de Triomphe, Paris',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Google Maps link generated successfully',
    type: ExportGoogleMapsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 500,
    description: 'Error generating Google Maps link',
  })
  exportGoogleMaps(@Body() googleMapsData: ExportGoogleMapsDto) {
    const startTime = Date.now();
    this.logger.log('Google Maps export requested', {
      event: 'fast_plan_maps_request',
      category: 'fast_plan_eco',
    });
    return this.fastPlanEcoService.exportGoogleMaps(googleMapsData).pipe(
      tap(() =>
        this.logger.log('Google Maps export succeeded', {
          event: 'fast_plan_maps_success',
          category: 'fast_plan_eco',
          duration_ms: Date.now() - startTime,
        }),
      ),
      map((response) => response.data),
      catchError((error: Error) => {
        this.logger.error('Google Maps export failed', {
          event: 'fast_plan_maps_failure',
          category: 'fast_plan_eco',
          duration_ms: Date.now() - startTime,
          error_message: error.message,
        });
        return throwError(() => error);
      }),
    );
  }
}
