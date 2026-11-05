/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { ExternalAdaptersController } from '../external-adapters.controller';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FixometerImpactMetricsQueryDto } from '../dto/fixometer-impact-metrics-query.dto';
import { IfixitSearchQueryDto } from '../dto/ifixit-search-query.dto';
import { IfixitPaginationQueryDto } from '../dto/ifixit-pagination-query.dto';

describe('ExternalAdaptersController', () => {
  let controller: ExternalAdaptersController;
  let mockExternalAdaptersProxy: jest.Mocked<ClientProxy>;
  let mockDevicesProxy: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    mockExternalAdaptersProxy = {
      send: jest.fn(),
    } as any;

    mockDevicesProxy = {
      send: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExternalAdaptersController],
      providers: [
        {
          provide: 'EXTERNAL_ADAPTERS_SERVICE',
          useValue: mockExternalAdaptersProxy,
        },
        {
          provide: 'DEVICES_SERVICE',
          useValue: mockDevicesProxy,
        },
      ],
    }).compile();

    controller = module.get<ExternalAdaptersController>(
      ExternalAdaptersController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('fetchFixometerImpactMetrics', () => {
    it('should return impact metrics successfully', async () => {
      const query: FixometerImpactMetricsQueryDto = { deviceType: 'Laptop' };
      const mockResponse = { co2: 132.7, equivalents: { carKm: 934.5 } };
      mockExternalAdaptersProxy.send.mockReturnValue(of(mockResponse));

      const result = await controller.fetchFixometerImpactMetrics(query);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockExternalAdaptersProxy.send).toHaveBeenCalledWith(
        { cmd: 'fetch-impact-metrics' },
        { deviceType: 'Laptop' },
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(result.timestamp).toBeDefined();
    });

    // The reference data is indexed by category, so the electrical flag that
    // used to be fetched from devices-service is no longer needed at all.
    it('should not look the device category up any more', async () => {
      const query: FixometerImpactMetricsQueryDto = { deviceType: 'Kettle' };
      mockExternalAdaptersProxy.send.mockReturnValue(of({ co2: 22.16 }));

      await controller.fetchFixometerImpactMetrics(query);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockDevicesProxy.send).not.toHaveBeenCalled();
    });

    // A category the reference data does not cover answers null, and that has
    // to reach the caller intact rather than becoming a zero.
    it('should pass a null result through', async () => {
      const query: FixometerImpactMetricsQueryDto = {
        deviceType: 'Washing machine / Combi dryer',
      };
      mockExternalAdaptersProxy.send.mockReturnValue(of(null));

      const result = await controller.fetchFixometerImpactMetrics(query);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle errors', async () => {
      const query: FixometerImpactMetricsQueryDto = { deviceType: 'Laptop' };
      mockExternalAdaptersProxy.send.mockReturnValue(
        throwError(() => new Error('Service unavailable')),
      );

      const result = await controller.fetchFixometerImpactMetrics(query);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service unavailable');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('searchIfixitDevice', () => {
    it('should return search results successfully', async () => {
      const query: IfixitSearchQueryDto = {
        query: 'MacBook Pro',
        type: 'computer',
        subject: 'repair',
        difficulty: 'moderate',
      };
      const mockResponse = [{ id: 1, name: 'MacBook Pro 13"' }];
      mockExternalAdaptersProxy.send.mockReturnValue(of(mockResponse));

      const result = await controller.searchIfixitDevice(query);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockExternalAdaptersProxy.send).toHaveBeenCalledWith(
        { cmd: 'search-device-ifixit' },
        {
          query: 'MacBook Pro',
          type: 'computer',
          subject: 'repair',
          difficulty: 'moderate',
        },
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });

    it('should pass the language on to the adapter', async () => {
      mockExternalAdaptersProxy.send.mockReturnValue(of([]));

      await controller.searchIfixitDevice({ query: 'Fairphone 4', lang: 'de' });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockExternalAdaptersProxy.send).toHaveBeenCalledWith(
        { cmd: 'search-device-ifixit' },
        expect.objectContaining({ query: 'Fairphone 4', lang: 'de' }),
      );
    });

    it('should accept only the four interface languages', async () => {
      const valid = plainToInstance(IfixitSearchQueryDto, { query: 'x', lang: 'nl' });
      const invalid = plainToInstance(IfixitSearchQueryDto, { query: 'x', lang: 'es' });

      expect(await validate(valid)).toHaveLength(0);
      expect((await validate(invalid)).map((e) => e.property)).toContain('lang');
    });
  });

  describe('getAllIfixitDevices', () => {
    it('should return paginated devices', async () => {
      const query: IfixitPaginationQueryDto = {
        page: 1,
        limit: 20,
      };
      const mockResponse = { devices: [], total: 100 };
      mockExternalAdaptersProxy.send.mockReturnValue(of(mockResponse));

      const result = await controller.getAllIfixitDevices(query);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockExternalAdaptersProxy.send).toHaveBeenCalledWith(
        { cmd: 'get-all-devices-ifixit' },
        { page: 1, limit: 20 },
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('getIfixitDeviceById', () => {
    it('should return device by id', async () => {
      const mockResponse = { id: '123', name: 'iPhone 12' };
      mockExternalAdaptersProxy.send.mockReturnValue(of(mockResponse));

      const result = await controller.getIfixitDeviceById('123');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockExternalAdaptersProxy.send).toHaveBeenCalledWith(
        { cmd: 'get-device-by-id-ifixit' },
        { id: '123' },
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('getIfixitDeviceParts', () => {
    it('should return device parts', async () => {
      const mockResponse = { parts: ['screen', 'battery', 'camera'] };
      mockExternalAdaptersProxy.send.mockReturnValue(of(mockResponse));

      const result = await controller.getIfixitDeviceParts('123');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockExternalAdaptersProxy.send).toHaveBeenCalledWith(
        { cmd: 'get-device-parts-ifixit' },
        { id: '123' },
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('getIfixitDeviceGuide', () => {
    it('should return device guide', async () => {
      const mockResponse = { steps: ['Step 1', 'Step 2'] };
      mockExternalAdaptersProxy.send.mockReturnValue(of(mockResponse));

      const result = await controller.getIfixitDeviceGuide('123', '456');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockExternalAdaptersProxy.send).toHaveBeenCalledWith(
        { cmd: 'get-device-guide-ifixit' },
        { id: '123', guideid: '456' },
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle errors', async () => {
      mockExternalAdaptersProxy.send.mockReturnValue(
        throwError(() => new Error('Guide not found')),
      );
      const result = await controller.getIfixitDeviceGuide('123', '456');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Guide not found');
    });
  });

  describe('error handling with non-Error objects', () => {
    it('should handle non-Error thrown objects in fetchFixometerImpactMetrics', async () => {
      const query: FixometerImpactMetricsQueryDto = {
        deviceType: 'laptop',
        weight: 2.5,
      };
      mockDevicesProxy.send.mockReturnValue(of(null));
      mockExternalAdaptersProxy.send.mockReturnValue(
        throwError(() => 'plain string error'),
      );
      const result = await controller.fetchFixometerImpactMetrics(query);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should handle non-Error thrown objects in searchIfixitDevice', async () => {
      const query: IfixitSearchQueryDto = {
        query: 'Mac',
        type: 'computer',
        subject: 'repair',
        difficulty: 'easy',
      };
      mockExternalAdaptersProxy.send.mockReturnValue(
        throwError(() => 'plain string error'),
      );
      const result = await controller.searchIfixitDevice(query);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should handle non-Error thrown objects in getAllIfixitDevices', async () => {
      const query: IfixitPaginationQueryDto = { page: 1, limit: 20 };
      mockExternalAdaptersProxy.send.mockReturnValue(
        throwError(() => 'string error'),
      );
      const result = await controller.getAllIfixitDevices(query);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should handle non-Error thrown objects in getIfixitDeviceById', async () => {
      mockExternalAdaptersProxy.send.mockReturnValue(
        throwError(() => 'string error'),
      );
      const result = await controller.getIfixitDeviceById('123');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should handle non-Error thrown objects in getIfixitDeviceParts', async () => {
      mockExternalAdaptersProxy.send.mockReturnValue(
        throwError(() => 'string error'),
      );
      const result = await controller.getIfixitDeviceParts('123');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should handle non-Error thrown objects in getIfixitDeviceGuide', async () => {
      mockExternalAdaptersProxy.send.mockReturnValue(
        throwError(() => 'string error'),
      );
      const result = await controller.getIfixitDeviceGuide('123', '456');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('getAllIfixitDevices error', () => {
    it('should handle errors', async () => {
      const query: IfixitPaginationQueryDto = { page: 1, limit: 20 };
      mockExternalAdaptersProxy.send.mockReturnValue(
        throwError(() => new Error('Service error')),
      );
      const result = await controller.getAllIfixitDevices(query);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Service error');
    });
  });

  describe('getIfixitDeviceById error', () => {
    it('should handle errors', async () => {
      mockExternalAdaptersProxy.send.mockReturnValue(
        throwError(() => new Error('Not found')),
      );
      const result = await controller.getIfixitDeviceById('999');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not found');
    });
  });

  describe('getIfixitDeviceParts error', () => {
    it('should handle errors', async () => {
      mockExternalAdaptersProxy.send.mockReturnValue(
        throwError(() => new Error('Parts unavailable')),
      );
      const result = await controller.getIfixitDeviceParts('999');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Parts unavailable');
    });
  });
});
