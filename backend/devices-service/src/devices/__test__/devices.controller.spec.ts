import { Test, TestingModule } from '@nestjs/testing';
import { DevicesController } from '../devices.controller';
import { RpcException } from '@nestjs/microservices';

const mockDevicesService = {
  findAll: jest.fn(),
  findAllV2: jest.fn(),
  getFilters: jest.fn(),
  searchDevices: jest.fn(),
  getById: jest.fn(),
  getByUrn: jest.fn(),
  findBySourceId: jest.fn(),
  getDevicesByIds: jest.fn(),
  createDevice: jest.fn(),
  updateDevice: jest.fn(),
};

describe('DevicesController', () => {
  let controller: DevicesController;
  let service: typeof mockDevicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [{ provide: 'IDevicesService', useValue: mockDevicesService }],
    }).compile();
    controller = module.get<DevicesController>(DevicesController);
    service = module.get('IDevicesService');
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get all devices', async () => {
    const devices = [{ id: 1 }];
    service.findAll.mockResolvedValue(devices);
    const result = await controller.getAllDevices();
    expect(result).toEqual(devices);
  });

  it('should throw RpcException on getAllDevices error', async () => {
    service.findAll.mockRejectedValue(new Error('fail'));
    await expect(controller.getAllDevices()).rejects.toThrow(RpcException);
  });

  it('should get filters', () => {
    service.getFilters.mockReturnValue(['filter']);
    const result = controller.getFilters();
    expect(result).toEqual(['filter']);
  });

  it('should throw RpcException on getFilters error', () => {
    service.getFilters.mockImplementation(() => {
      throw new Error('fail');
    });
    expect(() => controller.getFilters()).toThrow(RpcException);
  });

  it('should search devices', async () => {
    service.searchDevices.mockResolvedValue(['device']);
    const result = await controller.searchDevices({ query: 'q' });
    expect(result).toEqual(['device']);
  });

  it('should throw RpcException on searchDevices error', async () => {
    service.searchDevices.mockRejectedValue(new Error('fail'));
    await expect(controller.searchDevices({ query: 'q' })).rejects.toThrow(
      RpcException,
    );
  });

  it('should get device by id', async () => {
    service.getById.mockResolvedValue({ id: 1 });
    const result = await controller.getById({ id: 1 });
    expect(result).toEqual({ id: 1 });
  });

  it('should throw RpcException on getById error', async () => {
    service.getById.mockRejectedValue(new Error('fail'));
    await expect(controller.getById({ id: 1 })).rejects.toThrow(RpcException);
  });

  it('should get device by urn', async () => {
    const device = { id: 1, urn: 'urn:care2repair:device:1' };
    service.getByUrn.mockResolvedValue(device);
    const result = await controller.getByUrn({
      urn: 'urn:care2repair:device:1',
    });
    expect(result).toEqual(device);
  });

  it('should throw RpcException on getByUrn error', async () => {
    service.getByUrn.mockRejectedValue(new Error('fail'));
    await expect(
      controller.getByUrn({ urn: 'urn:care2repair:device:1' }),
    ).rejects.toThrow(RpcException);
  });

  it('should create a device', async () => {
    const payload = {
      ean: '123',
      import_id: 'import-1',
      import_date: new Date(),
      source_id: 'source-1',
    };
    service.createDevice.mockResolvedValue({ id: 1, ...payload });
    const result = await controller.createDevice(payload);
    expect(result).toEqual({ id: 1, ...payload });
    expect(service.createDevice).toHaveBeenCalledWith(payload);
  });

  it('should throw RpcException on createDevice error', async () => {
    service.createDevice.mockRejectedValue(new Error('fail'));
    await expect(controller.createDevice({})).rejects.toThrow(RpcException);
  });

  it('should get device by source id', async () => {
    const device = { device_id: 1, source_id: 'icecat-12345' };
    service.findBySourceId.mockResolvedValue(device);
    const result = await controller.getBySourceId({ sourceId: 'icecat-12345' });
    expect(result).toEqual(device);
    expect(service.findBySourceId).toHaveBeenCalledWith('icecat-12345');
  });

  it('should throw RpcException on getBySourceId error', async () => {
    service.findBySourceId.mockRejectedValue(new Error('fail'));
    await expect(
      controller.getBySourceId({ sourceId: 'test' }),
    ).rejects.toThrow(RpcException);
  });

  it('should update a device', async () => {
    const payload = { brand: 'Apple', model: 'iPhone 13' };
    const updatedDevice = { device_id: 1, ...payload };
    service.updateDevice.mockResolvedValue(updatedDevice);
    const result = await controller.updateDevice({ id: 1, payload });
    expect(result).toEqual(updatedDevice);
    expect(service.updateDevice).toHaveBeenCalledWith(1, payload);
  });

  it('should throw RpcException on updateDevice error', async () => {
    service.updateDevice.mockRejectedValue(new Error('fail'));
    await expect(
      controller.updateDevice({ id: 1, payload: {} }),
    ).rejects.toThrow(RpcException);
  });

  it('should get devices by ids', async () => {
    const devices = [{ device_id: 1 }, { device_id: 2 }];
    service.getDevicesByIds.mockResolvedValue(devices);
    const result = await controller.getDevicesByIds({ ids: [1, 2] });
    expect(result).toEqual(devices);
    expect(service.getDevicesByIds).toHaveBeenCalledWith([1, 2], undefined);
  });

  it('should throw RpcException on getDevicesByIds error', async () => {
    service.getDevicesByIds.mockRejectedValue(new Error('fail'));
    await expect(controller.getDevicesByIds({ ids: [1, 2] })).rejects.toThrow(
      RpcException,
    );
  });

  it('should get all devices v2', async () => {
    const result = {
      data: [{ device_id: 1 }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      categoryFacets: {},
    };
    service.findAllV2.mockResolvedValue(result);
    const response = await controller.getAllDevicesV2({
      query: { page: 1, limit: 10 },
    });
    expect(response).toEqual(result);
    expect(service.findAllV2).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it('should pass categories to findAllV2 and return categoryFacets', async () => {
    const result = {
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      categoryFacets: { Smartphones: 5 },
    };
    service.findAllV2.mockResolvedValue(result);
    const response = await controller.getAllDevicesV2({
      query: { page: 1, limit: 10, categories: 'Smartphones' },
    });
    expect(service.findAllV2).toHaveBeenCalledWith(
      expect.objectContaining({ categories: 'Smartphones' }),
    );
    expect(response.categoryFacets).toEqual({ Smartphones: 5 });
  });

  it('should throw RpcException on getAllDevicesV2 error', async () => {
    service.findAllV2.mockRejectedValue(new Error('fail'));
    await expect(controller.getAllDevicesV2({ query: {} })).rejects.toThrow(
      RpcException,
    );
  });
});
