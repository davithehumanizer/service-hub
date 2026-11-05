/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { DevicesService } from '../services/devices.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Device } from '../../entity/device.entity';
import { DeviceTechnicalProperty } from '../../entity/device-technical-property.entity';
import { DeviceInformationalProperty } from '../../entity/device-informational-property.entity';
import { DeviceCategory } from '../../entity/device-category.entity';
import { DevicePhoto } from '../../entity/device-photo.entity';
import { Repository } from 'typeorm';
import { DeviceSearchService } from '../../search/device-search.service';
import { ModelAssignmentService } from '../../device-models/model-assignment.service';

describe('DevicesService - Informational Properties', () => {
  let service: DevicesService;
  let deviceRepository: Repository<Device>;
  let informationalPropertyRepository: Repository<DeviceInformationalProperty>;

  const mockDeviceRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      leftJoin: jest.fn().mockReturnThis(),
    })),
    // The transaction hands out a manager that writes through the same mocks.
    manager: {
      transaction: jest.fn(async (work) =>
        work({
          delete: (entity, criteria) =>
            (entity === DeviceTechnicalProperty
              ? mockTechnicalPropertyRepository
              : mockInformationalPropertyRepository
            ).delete(criteria),
          save: (entity) => mockDeviceRepository.save(entity),
        }),
      ),
    },
  };

  const mockTechnicalPropertyRepository = {
    create: jest.fn(),
    delete: jest.fn(),
  };

  const mockInformationalPropertyRepository = {
    create: jest.fn(),
    delete: jest.fn(),
  };

  const mockDeviceCategoryRepository = {
    find: jest.fn(),
  };

  const mockDeviceSearchService = {
    indexDevice: jest.fn(),
    removeDevice: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        {
          provide: getRepositoryToken(Device),
          useValue: mockDeviceRepository,
        },
        {
          provide: getRepositoryToken(DeviceTechnicalProperty),
          useValue: mockTechnicalPropertyRepository,
        },
        {
          provide: getRepositoryToken(DeviceInformationalProperty),
          useValue: mockInformationalPropertyRepository,
        },
        {
          provide: getRepositoryToken(DeviceCategory),
          useValue: mockDeviceCategoryRepository,
        },
        {
          provide: getRepositoryToken(DevicePhoto),
          useValue: {},
        },
        {
          provide: DeviceSearchService,
          useValue: mockDeviceSearchService,
        },
        {
          provide: ModelAssignmentService,
          useValue: { assignDevice: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    deviceRepository = module.get<Repository<Device>>(
      getRepositoryToken(Device),
    );
    informationalPropertyRepository = module.get<
      Repository<DeviceInformationalProperty>
    >(getRepositoryToken(DeviceInformationalProperty));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDevice', () => {
    it('should create a device with informational properties', async () => {
      const createDeviceDto = {
        ean: '1234567890123',
        serial_number: 'SN123',
        product_code: 'PC123',
        manufacturer: 'Test Manufacturer',
        brand: 'Test Brand',
        model: 'Test Model',
        device_type: 'Smartphone',
        informationalProperties: [
          { property_name: 'description', property_value: 'A test device' },
          { property_name: 'release_date', property_value: '2023-01-01' },
        ],
      };

      const savedDevice = {
        device_id: 1,
        ...createDeviceDto,
        informationalProperties: [
          {
            property_id: 1,
            property_name: 'description',
            property_value: 'A test device',
          },
          {
            property_id: 2,
            property_name: 'release_date',
            property_value: '2023-01-01',
          },
        ],
      };

      mockDeviceRepository.create.mockReturnValue(savedDevice);
      mockDeviceRepository.save.mockResolvedValue(savedDevice);
      mockDeviceRepository.findOne.mockResolvedValue(savedDevice);
      mockInformationalPropertyRepository.create.mockImplementation(
        (dto) => dto,
      );

      const result = await service.createDevice(createDeviceDto);

      expect(mockDeviceRepository.create).toHaveBeenCalled();
      expect(mockInformationalPropertyRepository.create).toHaveBeenCalledTimes(
        2,
      );
      expect(mockDeviceRepository.save).toHaveBeenCalled();
      expect(result).toEqual(savedDevice);
      expect(result.informationalProperties).toHaveLength(2);
    });
  });

  describe('updateDevice', () => {
    it('should update informational properties', async () => {
      const deviceId = 1;
      const updatePayload = {
        informationalProperties: [
          {
            property_name: 'description',
            property_value: 'Updated description',
          },
        ],
      };

      const existingDevice = {
        device_id: deviceId,
        informationalProperties: [
          {
            property_id: 1,
            property_name: 'description',
            property_value: 'Old description',
          },
        ],
      };

      const updatedDevice = {
        ...existingDevice,
        informationalProperties: [
          {
            property_name: 'description',
            property_value: 'Updated description',
          },
        ],
      };

      mockDeviceRepository.findOne.mockResolvedValue(existingDevice);
      mockDeviceRepository.save.mockResolvedValue(updatedDevice);
      mockInformationalPropertyRepository.create.mockImplementation(
        (dto) => dto,
      );

      const result = await service.updateDevice(deviceId, updatePayload);

      expect(mockInformationalPropertyRepository.delete).toHaveBeenCalledWith({
        device: { device_id: deviceId },
      });
      expect(mockInformationalPropertyRepository.create).toHaveBeenCalledTimes(
        1,
      );
      expect(mockDeviceRepository.save).toHaveBeenCalled();
      expect(result.informationalProperties[0].property_value).toBe(
        'Updated description',
      );
    });
  });
});
