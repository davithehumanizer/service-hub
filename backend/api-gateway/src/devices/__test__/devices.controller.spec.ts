/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { DevicesController } from '../controllers/devices.controller';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { RoleCacheService } from 'src/roles/role-cache.service';
import { mockAuthService } from 'src/auth/__test__/mocks/auth-service.mock';
import { StorageService } from 'src/storage/storage.service';

describe('DevicesController', () => {
  let controller: DevicesController;
  const mockClientProxy = { send: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [
        { provide: 'DEVICES_SERVICE', useValue: mockClientProxy },
        mockAuthService(),
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
            getPublicUrl: jest.fn(),
          },
        },
        {
          provide: RoleCacheService,
          useValue: {
            getRoles: jest.fn(),
            // add other mocked methods if needed
          },
        },
      ],
    }).compile();
    controller = module.get<DevicesController>(DevicesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should throw 410 Gone for getAllDevicesV1', async () => {
    await expect(controller.getAllDevicesV1()).rejects.toThrow(
      new HttpException(
        'This endpoint is disabled due to performance issues. Please use v2 API.',
        HttpStatus.GONE,
      ),
    );
    expect(mockClientProxy.send).not.toHaveBeenCalled();
  });

  it('should get all devices v2', async () => {
    mockClientProxy.send.mockReturnValue(of(['device_v2']));

    const result = await controller.getAllDevicesV2({});
    expect(result).toEqual(['device_v2']);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'get_devices_v2' },
      {
        query: {},
        locale: 'en',
      },
    );
  });

  it('should throw on getAllDevicesV2 error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));

    await expect(controller.getAllDevicesV2({})).rejects.toThrow(HttpException);
  });

  it('should get filters', async () => {
    mockClientProxy.send.mockReturnValue(of(['filter']));
    const result = await controller.getFilters();
    expect(result).toEqual(['filter']);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'get_filters' },
      { locale: 'en' },
    );
  });

  it('should throw on getFilters error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.getFilters()).rejects.toThrow(HttpException);
  });

  it('should create a device', async () => {
    const body: CreateDeviceDto = {
      ean: 'ean123',
      serial_number: 'sn123',
      product_code: 'pc123',
      manufacturer: 'manu',
      brand: 'brand',
      model: 'model',
      categories: [1, 2],
      device_type: 'type',
      technicalProperties: [{ property_name: 'p', property_value: 'v' }],
      informationalProperties: [{ property_name: 'i', property_value: 'v' }],
    } as CreateDeviceDto;

    const created = { id: 999, ...body };
    mockClientProxy.send.mockReturnValue(of(created));

    const res = await controller.createDevice(body, {});
    expect(res).toEqual(created);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'create_device' },
      expect.objectContaining({ categories: [1, 2], ean: 'ean123' }),
    );
  });

  it('should create a device from legacy device_category', async () => {
    type LegacyDevice = Partial<CreateDeviceDto> & { device_category: number };
    const body: LegacyDevice = {
      ean: 'ean456',
      serial_number: 'sn456',
      product_code: 'pc456',
      manufacturer: 'manu',
      brand: 'brand',
      model: 'model',
      device_category: 3,
      device_type: 'type',
    };

    const created = { id: 1000, ...body, categories: [3] };
    mockClientProxy.send.mockReturnValue(of(created));

    const res = await controller.createDevice(
      body as unknown as CreateDeviceDto,
      {},
    );
    expect(res).toEqual(created);
    // ensure legacy field was converted to categories array
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'create_device' },
      expect.objectContaining({ categories: [3], ean: 'ean456' }),
    );
  });

  it('records who creates a device', async () => {
    mockClientProxy.send.mockReturnValue(of({}));
    await controller.createDevice({ ean: '4006381333931' } as CreateDeviceDto, {
      user: { id: 42, role: { name: 'user' } },
    });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'create_device' },
      expect.objectContaining({ created_by: 42, is_demo: false }),
    );
  });

  it('sends a contributor to the model route, which checks their codes', async () => {
    await expect(
      controller.createDevice({ ean: '4006381333931' } as CreateDeviceDto, {
        user: { id: 42, role: { name: 'contributor' } },
      }),
    ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    expect(mockClientProxy.send).not.toHaveBeenCalled();
  });

  it('should throw on createDevice error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(
      controller.createDevice({} as CreateDeviceDto, {}),
    ).rejects.toThrow(HttpException);
  });

  it('should get devices by ids', async () => {
    mockClientProxy.send.mockReturnValue(of(['d1', 'd2']));
    const result = await controller.getDevicesByIds('1,2');
    expect(result).toEqual(['d1', 'd2']);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'get_devices_by_ids' },
      { ids: [1, 2], locale: 'en' },
    );
  });

  it('should throw on getDevicesByIds error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.getDevicesByIds('1,2')).rejects.toThrow(
      HttpException,
    );
  });

  it('should search devices', async () => {
    mockClientProxy.send.mockReturnValue(of(['match']));
    const result = await controller.searchDevices('term');
    expect(result).toEqual(['match']);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'search_devices' },
      { query: 'term', strict: false, locale: 'en' },
    );
  });

  it('should search devices in strict mode', async () => {
    mockClientProxy.send.mockReturnValue(of(['exact']));
    const result = await controller.searchDevices('HP 290 G3', 'true');
    expect(result).toEqual(['exact']);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'search_devices' },
      { query: 'HP 290 G3', strict: true, locale: 'en' },
    );
  });

  it('should throw on searchDevices error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.searchDevices('term')).rejects.toThrow(
      HttpException,
    );
  });

  it('should get device by id', async () => {
    mockClientProxy.send.mockReturnValue(of({ id: 5 }));
    const result = await controller.getDeviceById(5);
    expect(result).toEqual({ id: 5 });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'get_device_by_id' },
      { id: 5, locale: 'en' },
    );
  });

  it('should throw on getDeviceById error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.getDeviceById(5)).rejects.toThrow(HttpException);
  });

  it('should get device by urn', async () => {
    const device = { device_id: 1, urn: 'urn:care2repair:device:1' };
    mockClientProxy.send.mockReturnValue(of(device));
    const result = await controller.getDeviceByUrn('urn:care2repair:device:1');
    expect(result).toEqual(device);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'get_device_by_urn' },
      { urn: 'urn:care2repair:device:1', locale: 'en' },
    );
  });

  it('should throw on getDeviceByUrn error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(
      controller.getDeviceByUrn('urn:care2repair:device:1'),
    ).rejects.toThrow(HttpException);
  });

  it('should throw 404 on getDeviceByUrn not found error', async () => {
    mockClientProxy.send.mockReturnValue(
      throwError(() => new Error('Device not found')),
    );
    await expect(
      controller.getDeviceByUrn('urn:care2repair:device:999'),
    ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
  });

  it('should get device by source id', async () => {
    const device = { device_id: 1, source_id: 'icecat-12345' };
    mockClientProxy.send.mockReturnValue(of(device));
    const result = await controller.getDeviceBySourceId('icecat-12345');
    expect(result).toEqual(device);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'get_device_by_source_id' },
      { sourceId: 'icecat-12345' },
    );
  });

  it('should throw on getDeviceBySourceId error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.getDeviceBySourceId('test')).rejects.toThrow(
      HttpException,
    );
  });

  it('should throw 404 on getDeviceBySourceId not found error', async () => {
    mockClientProxy.send.mockReturnValue(
      throwError(() => new Error('Device not found for source id')),
    );
    await expect(
      controller.getDeviceBySourceId('missing-id'),
    ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
  });

  it('should update a device', async () => {
    const body: CreateDeviceDto = {
      ean: 'ean123',
      brand: 'Apple',
      model: 'iPhone 13',
    } as CreateDeviceDto;
    const updatedDevice = { device_id: 1, ...body };
    mockClientProxy.send.mockReturnValue(of(updatedDevice));
    const result = await controller.updateDevice(1, body);
    expect(result).toEqual(updatedDevice);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'update_device' },
      { id: 1, payload: body },
    );
  });

  it('should update a device with legacy device_category', async () => {
    type LegacyDevice = Partial<CreateDeviceDto> & { device_category: number };
    const body: LegacyDevice = {
      ean: 'ean123',
      device_category: 3,
    };
    const updatedDevice = { device_id: 1, ...body, categories: [3] };
    mockClientProxy.send.mockReturnValue(of(updatedDevice));

    const result = await controller.updateDevice(
      1,
      body as unknown as CreateDeviceDto,
    );
    expect(result).toEqual(updatedDevice);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'update_device' },
      expect.objectContaining({
        id: 1,
        payload: expect.objectContaining({ categories: [3] }),
      }),
    );
  });

  it('should throw on updateDevice error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(
      controller.updateDevice(1, {} as CreateDeviceDto),
    ).rejects.toThrow(HttpException);
  });

  it("deletes a device's photo as its editor, 403 for another", async () => {
    mockClientProxy.send.mockReturnValue(of({ key: 'devices/7/a.png' }));
    const req = { user: { id: 42, role: { name: 'contributor' } } };

    expect(await controller.deleteDevicePhoto(7, 'p', req)).toEqual({
      success: true,
    });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'delete_device_photo' },
      {
        photoId: 'p',
        deviceId: 7,
        editor: { created_by: 42, is_demo: true, admin: false },
      },
    );

    mockClientProxy.send.mockReturnValue(
      throwError(
        () =>
          new Error('Only its author or an administrator may delete this photo'),
      ),
    );
    await expect(
      controller.deleteDevicePhoto(7, 'p', req),
    ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
  });
});
