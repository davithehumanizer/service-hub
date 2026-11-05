/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { FastPlanEcoController } from '../fast-plan-eco.controller';
import { FastPlanEcoService } from '../fast-plan-eco.service';
import { of, throwError, lastValueFrom } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('FastPlanEcoController', () => {
  let controller: FastPlanEcoController;
  let service: FastPlanEcoService;

  const mockFastPlanEcoService = {
    geocodeAddress: jest.fn(),
    calculateRoute: jest.fn(),
    exportGpx: jest.fn(),
    exportGoogleMaps: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FastPlanEcoController],
      providers: [
        {
          provide: FastPlanEcoService,
          useValue: mockFastPlanEcoService,
        },
      ],
    }).compile();

    controller = module.get<FastPlanEcoController>(FastPlanEcoController);
    service = module.get<FastPlanEcoService>(FastPlanEcoService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call geocodeAddress and return data', async () => {
    const mockAddress = { address: '123 Main St' };
    const mockResponse = { data: { lat: 1, lon: 2 } };
    mockFastPlanEcoService.geocodeAddress.mockReturnValue(of(mockResponse));

    const result = await lastValueFrom(controller.geocodeAddress(mockAddress));
    expect(result).toEqual(mockResponse.data);
    expect(service.geocodeAddress).toHaveBeenCalledWith(mockAddress);
  });

  it('should throw HttpException on geocodeAddress error', async () => {
    const mockAddress = { address: '123 Main St' };
    mockFastPlanEcoService.geocodeAddress.mockReturnValue(
      throwError(
        () =>
          new HttpException('Service error', HttpStatus.INTERNAL_SERVER_ERROR),
      ),
    );

    await expect(
      lastValueFrom(controller.geocodeAddress(mockAddress)),
    ).rejects.toThrow(HttpException);
  });

  it('should call calculateRoute and return data', async () => {
    const mockRouteData = {
      baseAddress: { lat: 40.7128, lng: -74.006 },
      followingAddresses: [{ lat: 34.0522, lng: -118.2437 }],
      vehicle: 'car' as const,
    };
    const mockResponse = { data: { distance: 100 } };
    mockFastPlanEcoService.calculateRoute.mockReturnValue(of(mockResponse));

    const result = await lastValueFrom(
      controller.calculateRoute(mockRouteData),
    );
    expect(result).toEqual(mockResponse.data);
    expect(service.calculateRoute).toHaveBeenCalledWith(mockRouteData);
  });

  it('should throw HttpException on calculateRoute error', async () => {
    const mockRouteData = {
      baseAddress: { lat: 40.7128, lng: -74.006 },
      followingAddresses: [{ lat: 34.0522, lng: -118.2437 }],
      vehicle: 'car' as const,
    };
    mockFastPlanEcoService.calculateRoute.mockReturnValue(
      throwError(
        () =>
          new HttpException('Service error', HttpStatus.INTERNAL_SERVER_ERROR),
      ),
    );

    await expect(
      lastValueFrom(controller.calculateRoute(mockRouteData)),
    ).rejects.toThrow(HttpException);
  });

  it('should call exportGpx and return data', async () => {
    const mockGpxData = {
      waypoints: [
        { lat: 40.7128, lng: -74.006, name: 'Start' },
        { lat: 34.0522, lng: -118.2437, name: 'End' },
      ],
    };
    const mockResponse = { data: { file: 'gpx_file' } };
    mockFastPlanEcoService.exportGpx.mockReturnValue(of(mockResponse));

    const result = await lastValueFrom(controller.exportGpx(mockGpxData));
    expect(result).toEqual(mockResponse.data);
    expect(service.exportGpx).toHaveBeenCalledWith(mockGpxData);
  });

  it('should throw HttpException on exportGpx error', async () => {
    const mockGpxData = {
      waypoints: [
        { lat: 40.7128, lng: -74.006, name: 'Start' },
        { lat: 34.0522, lng: -118.2437, name: 'End' },
      ],
    };
    mockFastPlanEcoService.exportGpx.mockReturnValue(
      throwError(
        () =>
          new HttpException('Service error', HttpStatus.INTERNAL_SERVER_ERROR),
      ),
    );

    await expect(
      lastValueFrom(controller.exportGpx(mockGpxData)),
    ).rejects.toThrow(HttpException);
  });

  it('should call exportGoogleMaps and return data', async () => {
    const mockGoogleMapsData = {
      waypoints: [
        { lat: 40.7128, lng: -74.006, address: 'New York' },
        { lat: 34.0522, lng: -118.2437, address: 'Los Angeles' },
      ],
    };
    const mockResponse = { data: { url: 'google_maps_url' } };
    mockFastPlanEcoService.exportGoogleMaps.mockReturnValue(of(mockResponse));

    const result = await lastValueFrom(
      controller.exportGoogleMaps(mockGoogleMapsData),
    );
    expect(result).toEqual(mockResponse.data);
    expect(service.exportGoogleMaps).toHaveBeenCalledWith(mockGoogleMapsData);
  });

  it('should throw HttpException on exportGoogleMaps error', async () => {
    const mockGoogleMapsData = {
      waypoints: [
        { lat: 40.7128, lng: -74.006, address: 'New York' },
        { lat: 34.0522, lng: -118.2437, address: 'Los Angeles' },
      ],
    };
    mockFastPlanEcoService.exportGoogleMaps.mockReturnValue(
      throwError(
        () =>
          new HttpException('Service error', HttpStatus.INTERNAL_SERVER_ERROR),
      ),
    );

    await expect(
      lastValueFrom(controller.exportGoogleMaps(mockGoogleMapsData)),
    ).rejects.toThrow(HttpException);
  });
});
