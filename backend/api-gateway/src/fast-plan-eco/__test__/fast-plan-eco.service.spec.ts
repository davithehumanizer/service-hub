/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { FastPlanEcoService } from '../fast-plan-eco.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';

describe('FastPlanEcoService', () => {
  let service: FastPlanEcoService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'FAST_PLAN_ECO_SERVICE_HOST') {
        return 'localhost';
      }
      if (key === 'FAST_PLAN_ECO_SERVICE_PORT') {
        return '5000';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FastPlanEcoService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FastPlanEcoService>(FastPlanEcoService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call httpService.post for geocodeAddress', (done) => {
    const mockAddress = { address: '123 Main St' };
    const mockResponse = { data: { lat: 1, lon: 2 } };
    mockHttpService.post.mockReturnValue(of(mockResponse));

    service.geocodeAddress(mockAddress).subscribe((response) => {
      expect(response).toEqual(mockResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:5000/api/geocode-address',
        mockAddress,
      );
      done();
    });
  });

  it('should call httpService.post for calculateRoute', (done) => {
    const mockRouteData = {
      baseAddress: { lat: 40.7128, lng: -74.006 },
      followingAddresses: [{ lat: 34.0522, lng: -118.2437 }],
      vehicle: 'car' as const,
    };
    const mockResponse = { data: { distance: 100 } };
    mockHttpService.post.mockReturnValue(of(mockResponse));

    service.calculateRoute(mockRouteData).subscribe((response) => {
      expect(response).toEqual(mockResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:5000/api/calculate-route',
        mockRouteData,
      );
      done();
    });
  });

  it('should call httpService.post for exportGpx', (done) => {
    const mockGpxData = {
      waypoints: [
        { lat: 40.7128, lng: -74.006, name: 'Start' },
        { lat: 34.0522, lng: -118.2437, name: 'End' },
      ],
    };
    const mockResponse = { data: { file: 'gpx_file' } };
    mockHttpService.post.mockReturnValue(of(mockResponse));

    service.exportGpx(mockGpxData).subscribe((response) => {
      expect(response).toEqual(mockResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:5000/api/export-gpx',
        mockGpxData,
      );
      done();
    });
  });

  it('should call httpService.post for exportGoogleMaps', (done) => {
    const mockGoogleMapsData = {
      waypoints: [
        { lat: 40.7128, lng: -74.006, address: 'New York' },
        { lat: 34.0522, lng: -118.2437, address: 'Los Angeles' },
      ],
    };
    const mockResponse = { data: { url: 'google_maps_url' } };
    mockHttpService.post.mockReturnValue(of(mockResponse));

    service.exportGoogleMaps(mockGoogleMapsData).subscribe((response) => {
      expect(response).toEqual(mockResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:5000/api/export-googlemaps',
        mockGoogleMapsData,
      );
      done();
    });
  });
});
