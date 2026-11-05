import { DeviceCategory } from '../../entity/device-category.entity';
/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DevicesService } from '../services/devices.service';
import { Device } from '../../entity/device.entity';
import { DeviceTechnicalProperty } from '../../entity/device-technical-property.entity';
import { DeviceInformationalProperty } from '../../entity/device-informational-property.entity';
import { DevicePhoto } from '../../entity/device-photo.entity';
import { NotFoundException } from '@nestjs/common';
import { DeviceSearchService } from '../../search/device-search.service';
import { ModelAssignmentService } from '../../device-models/model-assignment.service';

const mockQueryBuilder = {
  leftJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  distinct: jest.fn().mockReturnThis(),
  getCount: jest.fn().mockResolvedValue(0),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue([]),
  getMany: jest.fn().mockResolvedValue([]),
  orderBy: jest.fn().mockReturnThis(),
};

const mockDeviceRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findBy: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
  manager: { transaction: jest.fn() },
});
const mockDeviceTechRepo = () => ({
  // Add methods if needed
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});
const mockDeviceInfoRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});
const mockDeviceCategoryRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockDeviceSearchService = () => ({
  indexDevice: jest.fn(),
  removeDevice: jest.fn(),
  searchDevicesPaginated: jest.fn(),
});

describe('DevicesService', () => {
  let service: DevicesService;
  let deviceRepo: ReturnType<typeof mockDeviceRepo>;
  let deviceTechRepo: ReturnType<typeof mockDeviceTechRepo>;
  let deviceInfoRepo: ReturnType<typeof mockDeviceInfoRepo>;
  let deviceCategoryRepo: ReturnType<typeof mockDeviceCategoryRepo>;
  let deviceSearchService: ReturnType<typeof mockDeviceSearchService>;
  let modelAssignment: { assignDevice: jest.Mock };

  it('should create a device with categories', async () => {
    const category1 = { id: 1, name: 'Smartphone' } as DeviceCategory;
    const category2 = { id: 2, name: 'Android' } as DeviceCategory;
    const device = {
      device_id: 1,
      brand: 'Samsung',
      model: 'S21',
      categories: [category1, category2],
    } as Device;
    deviceRepo.create.mockReturnValue(device);
    deviceRepo.save.mockResolvedValue(device);
    deviceRepo.findOne.mockResolvedValue(device); // Fix for getById
    deviceRepo.update.mockResolvedValue({} as any);
    // service expects categories to be an array of IDs
    deviceCategoryRepo.find.mockResolvedValue([category1, category2]);

    const payload = {
      brand: 'Samsung',
      model: 'S21',
      categories: [1, 2], // IDs instead of names
    } as any;
    const result = await service.createDevice(payload);
    expect(result.categories.length).toBe(2);
    expect(result.categories[0].name).toBe('Smartphone');
    expect(result.categories[1].name).toBe('Android');
    expect(deviceCategoryRepo.find).toHaveBeenCalledWith({
      where: { id: expect.anything() },
    });
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: getRepositoryToken(Device), useFactory: mockDeviceRepo },
        {
          provide: getRepositoryToken(DeviceTechnicalProperty),
          useFactory: mockDeviceTechRepo,
        },
        {
          provide: getRepositoryToken(DeviceInformationalProperty),
          useFactory: mockDeviceInfoRepo,
        },
        {
          provide: getRepositoryToken(DeviceCategory),
          useFactory: mockDeviceCategoryRepo,
        },
        {
          provide: getRepositoryToken(DevicePhoto),
          useFactory: () => ({
            create: jest.fn((p) => p),
            save: jest.fn(async (p) => p),
            findOne: jest.fn(),
            remove: jest.fn(),
          }),
        },
        {
          provide: DeviceSearchService,
          useFactory: mockDeviceSearchService,
        },
        {
          provide: ModelAssignmentService,
          useFactory: () => ({ assignDevice: jest.fn() }),
        },
      ],
    }).compile();
    service = module.get<DevicesService>(DevicesService);
    deviceRepo = module.get(getRepositoryToken(Device));
    deviceTechRepo = module.get(getRepositoryToken(DeviceTechnicalProperty));
    deviceInfoRepo = module.get(
      getRepositoryToken(DeviceInformationalProperty),
    );
    deviceCategoryRepo = module.get(getRepositoryToken(DeviceCategory));
    deviceSearchService = module.get(DeviceSearchService);
    modelAssignment = module.get(ModelAssignmentService);
    // The transaction hands out a manager that writes through the same mocks.
    deviceRepo.manager.transaction.mockImplementation(async (work) =>
      work({
        delete: (entity, criteria) =>
          (entity === DeviceTechnicalProperty
            ? deviceTechRepo
            : deviceInfoRepo
          ).delete(criteria),
        save: (entity) => deviceRepo.save(entity),
      }),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all devices', async () => {
    const devices = [{ id: 1 }];
    deviceRepo.find.mockResolvedValue(devices);
    const result = await service.findAll();
    expect(result).toEqual(devices);
  });

  describe('findAllV2', () => {
    it('should use elasticsearch and return sorted results', async () => {
      const mockEsResult = {
        total: 2,
        data: [{ device_id: '10' }, { device_id: '20' }],
        categoryFacets: {},
      };
      const mockDevices = [
        { device_id: 20, brand: 'B2' },
        { device_id: 10, brand: 'B1' },
      ];

      deviceSearchService.searchDevicesPaginated.mockResolvedValue(
        mockEsResult,
      );
      deviceRepo.find.mockResolvedValue(mockDevices);

      const result = await service.findAllV2({
        search: 'test',
        page: 1,
        limit: 10,
      });

      expect(deviceSearchService.searchDevicesPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
          search: 'test',
          strict: false,
        }),
      );
      expect(deviceRepo.find).toHaveBeenCalledWith({
        where: { device_id: expect.anything() },
        relations: ['categories'],
        relationLoadStrategy: 'query',
      });
      // Verification of sort: 10 then 20 as in ES result
      expect(result.data[0].device_id).toBe(10);
      expect(result.data[1].device_id).toBe(20);
      expect(result.pagination.total).toBe(2);
    });

    it('should fallback to database if elasticsearch fails', async () => {
      const mockDevicesIds = [{ device_device_id: 30 }];
      const mockFullDevices = [{ device_id: 30, brand: 'Fallback' }];

      deviceSearchService.searchDevicesPaginated.mockRejectedValue(
        new Error('ES Down'),
      );

      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getRawMany.mockResolvedValue(mockDevicesIds);
      deviceRepo.find.mockResolvedValue(mockFullDevices);

      const result = await service.findAllV2({ search: 'fallback' });

      expect(mockQueryBuilder.getCount).toHaveBeenCalled();
      expect(result.data[0].device_id).toBe(30);
    });

    it('should bypass elasticsearch and use database with deterministic ordering when bypassEs is true', async () => {
      const queryBuilderMock = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
        // First call returns the device ids, later ones the category facet rows
        getRawMany: jest
          .fn()
          .mockResolvedValueOnce([{ device_device_id: 1 }])
          .mockResolvedValue([]),
      } as any;

      deviceRepo.createQueryBuilder.mockReturnValue(queryBuilderMock);
      deviceRepo.find.mockResolvedValue([{ device_id: 1 }] as Device[]);

      // Reset mock to ensure we catch if it's called
      deviceSearchService.searchDevicesPaginated.mockClear();

      const result = await service.findAllV2({
        page: 1,
        limit: 10,
        bypassEs: true,
      });

      // Ensure ES was NOT called
      expect(deviceSearchService.searchDevicesPaginated).not.toHaveBeenCalled();

      // Ensure DB query used orderBy
      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith(
        'device.device_id',
        'ASC',
      );
      expect(result.data).toHaveLength(1);
    });

    it('should pass strict=true to elasticsearch when strict mode is enabled', async () => {
      deviceSearchService.searchDevicesPaginated.mockResolvedValue({
        total: 2,
        data: [{ device_id: '10' }, { device_id: '20' }],
        categoryFacets: {},
      });
      deviceRepo.find.mockResolvedValue([
        { device_id: 10 },
        { device_id: 20 },
      ] as any);

      await service.findAllV2({
        search: 'HP 290 G3',
        page: 1,
        limit: 10,
        strict: true,
      });

      expect(deviceSearchService.searchDevicesPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
          search: 'HP 290 G3',
          strict: true,
        }),
      );
    });

    it('should search a barcode unstrict even when strict mode is asked', async () => {
      // Aachen, 15/09: the Roborock Saros Z70 was only found after pressing
      // "extended search" everywhere but the wizard's own barcode screen.
      deviceSearchService.searchDevicesPaginated.mockResolvedValue({
        total: 1,
        data: [{ device_id: '10' }],
        categoryFacets: {},
      });
      deviceRepo.find.mockResolvedValue([{ device_id: 10 }] as Device[]);

      await service.findAllV2({ search: '6936905900777', strict: true });

      expect(deviceSearchService.searchDevicesPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ search: '6936905900777', strict: false }),
      );
    });

    it('should pass categories array to elasticsearch', async () => {
      deviceSearchService.searchDevicesPaginated.mockResolvedValue({
        total: 1,
        data: [{ device_id: '10' }],
        categoryFacets: { Smartphones: 1 },
      });
      deviceRepo.find.mockResolvedValue([{ device_id: 10 }] as Device[]);

      await service.findAllV2({
        search: 'test',
        categories: 'Smartphones,Laptops',
        page: 1,
        limit: 10,
      });

      expect(deviceSearchService.searchDevicesPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ categories: ['Smartphones', 'Laptops'] }),
      );
    });

    it('should return categoryFacets from elasticsearch when non-empty', async () => {
      deviceSearchService.searchDevicesPaginated.mockResolvedValue({
        total: 2,
        data: [{ device_id: '10' }, { device_id: '20' }],
        categoryFacets: { Smartphones: 5, Laptops: 3 },
      });
      deviceRepo.find.mockResolvedValue([
        { device_id: 10 },
        { device_id: 20 },
      ] as Device[]);

      const result = await service.findAllV2({ search: 'test' });

      expect(result.categoryFacets).toEqual({ Smartphones: 5, Laptops: 3 });
    });

    it('should apply innerJoin for category filter in DB fallback path', async () => {
      const qbMock = {
        select: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        getRawMany: jest
          .fn()
          .mockResolvedValueOnce([
            { device_device_id: 1 },
            { device_device_id: 2 },
          ])
          .mockResolvedValue([]),
      } as any;
      deviceRepo.createQueryBuilder.mockReturnValue(qbMock);
      deviceRepo.find.mockResolvedValue([
        { device_id: 1 },
        { device_id: 2 },
      ] as Device[]);
      deviceSearchService.searchDevicesPaginated.mockRejectedValue(
        new Error('ES Down'),
      );

      await service.findAllV2({
        search: 'samsung',
        categories: 'Smartphones',
        strict: true,
      });

      expect(qbMock.innerJoin).toHaveBeenCalledWith(
        'device.categories',
        'filterCat',
        'filterCat.name IN (:...catFilter)',
        { catFilter: ['Smartphones'] },
      );
    });

    it('should set categoryFacets to {[category]: total} for category-only queries', async () => {
      deviceSearchService.searchDevicesPaginated.mockResolvedValue({
        total: 0,
        data: [],
        categoryFacets: {},
      });
      const qbMock = {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
        getRawMany: jest
          .fn()
          .mockResolvedValue([
            { device_device_id: 1 },
            { device_device_id: 2 },
            { device_device_id: 3 },
          ]),
      } as any;
      deviceRepo.createQueryBuilder.mockReturnValue(qbMock);
      deviceRepo.find.mockResolvedValue([
        { device_id: 1 },
        { device_id: 2 },
        { device_id: 3 },
      ] as Device[]);

      const result = await service.findAllV2({
        categories: 'Aspirateur robot',
      });

      expect(result.categoryFacets).toEqual({ 'Aspirateur robot': 3 });
      expect(result.pagination.total).toBe(3);
    });

    it('should compute DB facets using CONCAT ILIKE in strict mode when ES returns empty facets', async () => {
      const facetQbMock = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ categoryName: 'Smartphones', cnt: '12' }]),
      } as any;
      deviceSearchService.searchDevicesPaginated.mockResolvedValue({
        total: 2,
        data: [{ device_id: '10' }, { device_id: '20' }],
        categoryFacets: {},
      });
      deviceRepo.find.mockResolvedValue([
        { device_id: 10 },
        { device_id: 20 },
      ] as Device[]);
      deviceRepo.createQueryBuilder.mockReturnValue(facetQbMock);

      const result = await service.findAllV2({
        search: 'Samsung',
        strict: true,
      });

      expect(facetQbMock.where).toHaveBeenCalledWith(
        `CONCAT(fDevice.brand, ' ', fDevice.model) ILIKE :facetPhrase`,
        { facetPhrase: '%Samsung%' },
      );
      expect(result.categoryFacets).toEqual({ Smartphones: 12 });
    });

    it('should call andWhere once per keyword in non-strict DB facet computation', async () => {
      const facetQbMock = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ categoryName: 'Laptops', cnt: '3' }]),
      } as any;
      deviceSearchService.searchDevicesPaginated.mockResolvedValue({
        total: 1,
        data: [{ device_id: '5' }],
        categoryFacets: {},
      });
      deviceRepo.find.mockResolvedValue([{ device_id: 5 }] as Device[]);
      deviceRepo.createQueryBuilder.mockReturnValue(facetQbMock);

      const result = await service.findAllV2({
        search: 'smart phone',
        strict: false,
      });

      // 'smart phone' splits into 2 keywords → andWhere called once per keyword
      expect(facetQbMock.andWhere).toHaveBeenCalledTimes(2);
      expect(result.categoryFacets).toEqual({ Laptops: 3 });
    });

    it('should return empty result and skip entity loading when no devices found', async () => {
      deviceSearchService.searchDevicesPaginated.mockResolvedValue({
        total: 0,
        data: [],
        categoryFacets: {},
      });
      mockQueryBuilder.getCount.mockResolvedValue(0);
      deviceRepo.find.mockClear();

      const result = await service.findAllV2({
        search: 'nonexistent-xyzabc-query',
      });

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.categoryFacets).toEqual({});
      expect(deviceRepo.find).not.toHaveBeenCalled();
    });

    it('should use CONCAT phrase match in TypeORM fallback when strict=true', async () => {
      const queryBuilderMock = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getRawMany: jest
          .fn()
          .mockResolvedValueOnce([{ device_device_id: 42 }])
          .mockResolvedValue([]),
      } as any;

      deviceRepo.createQueryBuilder.mockReturnValue(queryBuilderMock);
      deviceRepo.find.mockResolvedValue([{ device_id: 42 }] as any);
      deviceSearchService.searchDevicesPaginated.mockRejectedValue(
        new Error('ES Down'),
      );

      await service.findAllV2({ search: 'HP 290 G3', strict: true });

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        `CONCAT(device.brand, ' ', device.model) ILIKE :phrase`,
        { phrase: '%HP 290 G3%' },
      );
    });
  });

  it('should return filters', async () => {
    // Create a single mock object for the query builder
    const queryBuilderMock = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValueOnce([{ brand: 'Apple', categories: ['mobile'] }])
        .mockResolvedValueOnce([{ device_category: 'mobile' }]),
    } as any;
    deviceRepo.createQueryBuilder.mockReturnValue(queryBuilderMock);

    const result = await service.getFilters();
    expect(result).toEqual([
      {
        id: 'brand-Apple',
        category: 'brand',
        name: 'Apple',
        categories: ['mobile'],
      },
      {
        id: 'device_category-mobile',
        category: 'device_category',
        name: 'mobile',
      },
    ]);
  });

  it('should throw NotFoundException if device not found', async () => {
    deviceRepo.findOne.mockResolvedValue(null);
    await expect(service.getById(1)).rejects.toThrow(NotFoundException);
    expect(deviceRepo.findOne).toHaveBeenCalledWith({
      where: { device_id: 1 },
      relations: [
        'technicalProperties',
        'categories',
        'informationalProperties',
        'photos',
      ],
      relationLoadStrategy: 'query',
    });
  });

  it('should return device by URN', async () => {
    const device = { device_id: 1, urn: 'urn:care2repair:device:1' };
    deviceRepo.findOne.mockResolvedValue(device);
    const result = await service.getByUrn('urn:care2repair:device:1');
    expect(result).toEqual(device);
    expect(deviceRepo.findOne).toHaveBeenCalledWith({
      where: { urn: 'urn:care2repair:device:1' },
      relations: [
        'technicalProperties',
        'categories',
        'informationalProperties',
        'photos',
      ],
      relationLoadStrategy: 'query',
    });
  });

  it('should throw NotFoundException if device not found by URN', async () => {
    deviceRepo.findOne.mockResolvedValue(null);
    await expect(
      service.getByUrn('urn:care2repair:device:999'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should create a device and its technical properties', async () => {
    const payload: Partial<Device> & {
      technicalProperties: any[];
    } = {
      ean: '111',
      serial_number: 'SN1',
      product_code: 'PC1',
      manufacturer: 'M',
      brand: 'B',
      model: 'Model',
      device_type: 'Phone',
      import_id: 'import-123',
      import_date: new Date('2023-01-01'),
      source_id: 'source-123',
      technicalProperties: [
        {
          property_name: 'color',
          property_value: 'black',
        },
      ] as any[],
    };

    const createdDevice: Partial<Device> & { device_id: number } = {
      ...payload,
      device_id: 42,
    };
    // Mock create/save/findOne behavior
    deviceRepo.create.mockReturnValue(createdDevice);
    deviceRepo.save.mockResolvedValue(createdDevice);
    deviceRepo.findOne.mockResolvedValue({
      ...createdDevice,
      technicalProperties: [
        {
          property_id: 1,
          property_name: 'color',
          property_value: 'black',
        },
      ],
    });

    // Mock technical property repo behavior
    deviceTechRepo.create.mockImplementation((p) => p);
    deviceTechRepo.save.mockResolvedValue([
      {
        property_id: 1,
        property_name: payload.technicalProperties[0].property_name as string,
        property_value: payload.technicalProperties[0].property_value as string,
      },
    ]);

    const result = await service.createDevice(payload);

    expect(deviceRepo.create).toHaveBeenCalled();
    expect(deviceRepo.save).toHaveBeenCalled();
    expect(deviceTechRepo.create).toHaveBeenCalled();
    expect(result.device_id).toBe(42);
    expect(result.technicalProperties).toHaveLength(1);
    expect(result.import_id).toBe('import-123');
    expect(result.source_id).toBe('source-123');
  });

  it('searchDevices should return empty array when query is empty', async () => {
    const result = await service.searchDevices('');
    expect(result).toEqual([]);
  });

  it('searchDevices should fallback to repository.find when queryBuilder results lack categories', async () => {
    // Mock a QueryBuilder that returns results without a `categories` property
    const queryBuilderMock = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ device_id: 10 }]),
    } as any;

    deviceRepo.createQueryBuilder.mockReturnValue(queryBuilderMock);

    // When fallback occurs, repository.find should be called and return devices with categories
    const found = [
      {
        device_id: 10,
        technicalProperties: [],
        categories: [{ id: 5, name: 'fallback' }],
      },
    ];
    deviceRepo.find.mockResolvedValue(found as any);

    const result = await service.searchDevices('keyword');
    expect(result).toEqual(found);
    expect(deviceRepo.createQueryBuilder).toHaveBeenCalled();
    expect(deviceRepo.find).toHaveBeenCalled();
  });

  it('getDevicesByIds should throw NotFoundException when an id is missing', async () => {
    const ids = [1, 2, 3];
    // Return only one device -> length mismatch should trigger exception
    deviceRepo.find.mockResolvedValue([{ device_id: 1 }]);
    await expect(service.getDevicesByIds(ids)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('findBySourceId should return device when found', async () => {
    const device = {
      device_id: 1,
      source_id: 'icecat-12345',
      brand: 'Samsung',
      model: 'S21',
      technicalProperties: [],
      categories: [],
    } as any;
    deviceRepo.findOne.mockResolvedValue(device);
    const result = await service.findBySourceId('icecat-12345');
    expect(result).toEqual(device);
    expect(deviceRepo.findOne).toHaveBeenCalledWith({
      where: { source_id: 'icecat-12345' },
      relations: [
        'technicalProperties',
        'categories',
        'informationalProperties',
        'photos',
      ],
      relationLoadStrategy: 'query',
    });
  });

  it('findBySourceId should return null when not found', async () => {
    deviceRepo.findOne.mockResolvedValue(null);
    const result = await service.findBySourceId('nonexistent');
    expect(result).toBeNull();
  });

  it('existsBySourceId should return device_id when found', async () => {
    const device = {
      device_id: 42,
    } as any;
    deviceRepo.findOne.mockResolvedValue(device);
    const result = await service.existsBySourceId('icecat-12345');
    expect(result).toEqual({ device_id: 42 });
    expect(deviceRepo.findOne).toHaveBeenCalledWith({
      where: { source_id: 'icecat-12345' },
      select: ['device_id'],
    });
  });

  it('existsBySourceId should return null when not found', async () => {
    deviceRepo.findOne.mockResolvedValue(null);
    const result = await service.existsBySourceId('nonexistent');
    expect(result).toBeNull();
  });

  it('existsBySourceId should not load relations (performance optimization)', async () => {
    const device = {
      device_id: 42,
    } as any;
    deviceRepo.findOne.mockResolvedValue(device);
    await service.existsBySourceId('icecat-12345');

    // Verify that only device_id is selected, not relations
    expect(deviceRepo.findOne).toHaveBeenCalledWith({
      where: { source_id: 'icecat-12345' },
      select: ['device_id'],
    });

    // Verify relations are NOT requested
    expect(deviceRepo.findOne).not.toHaveBeenCalledWith(
      expect.objectContaining({
        relations: expect.anything(),
      }),
    );
  });

  it('createDevice assigns the new device to its model before indexing it', async () => {
    const device = {
      device_id: 7,
      brand: 'Samsung',
      model: 'Galaxy S23',
    } as any;
    deviceRepo.create.mockReturnValue(device);
    deviceRepo.save.mockResolvedValue(device);
    deviceRepo.findOne.mockResolvedValue(device);
    const order: string[] = [];
    modelAssignment.assignDevice.mockImplementation(async () => {
      order.push('assign');
    });
    deviceSearchService.indexDevice.mockImplementation(async () => {
      order.push('index');
    });

    await service.createDevice({
      brand: 'Samsung',
      model: 'Galaxy S23',
    } as any);

    expect(modelAssignment.assignDevice).toHaveBeenCalledWith(7);
    expect(order).toEqual(['assign', 'index']);
  });

  it('updateDevice reassigns the model and returns the device as stored', async () => {
    const stored = {
      device_id: 3,
      brand: 'Samsung',
      model: 'S21',
      model_id: 9,
    } as any;
    deviceRepo.findOne.mockResolvedValue(stored);
    deviceRepo.save.mockImplementation(async (d) => d as any);

    const result = await service.updateDevice(3, { model: 'S21 FE' } as any);

    expect(modelAssignment.assignDevice).toHaveBeenCalledWith(3);
    expect(deviceRepo.findOne).toHaveBeenCalledTimes(2);
    expect(result).toBe(stored);
  });

  it('updateDevice leaves the model alone when nothing it depends on changes', async () => {
    deviceRepo.findOne.mockResolvedValue({
      device_id: 3,
      brand: 'Samsung',
      model: 'S21',
      product_code: 'SM-G991B',
      informationalProperties: [{ property_name: 'URL', property_value: 'u' }],
    } as any);
    deviceRepo.save.mockImplementation(async (d) => d as any);
    deviceInfoRepo.create.mockImplementation((p) => p as any);

    // A re-import sends every field again, the same ones.
    await service.updateDevice(3, {
      ean: '8806092021539',
      model: 'S21',
      informationalProperties: [
        { property_name: 'URL', property_value: 'u' },
        { property_name: 'Warranty', property_value: '2 years' },
      ],
    } as any);

    expect(modelAssignment.assignDevice).not.toHaveBeenCalled();
  });

  it("recomputes the device's model when its photos change", async () => {
    const photos = (service as any).devicePhotoRepository;
    await service.addDevicePhotos(7, [{ url: 'u.jpg', key: 'k' }]);
    expect(modelAssignment.assignDevice).toHaveBeenCalledWith(7);

    photos.findOne.mockResolvedValue({ id: 'p', key: 'k', deviceId: 8 });
    expect(await service.deleteDevicePhoto('p')).toEqual({ key: 'k' });
    expect(modelAssignment.assignDevice).toHaveBeenCalledWith(8);
  });

  it('updateDevice should update device with new data', async () => {
    const existingDevice = {
      device_id: 1,
      brand: 'Samsung',
      model: 'S21',
      technicalProperties: [],
      categories: [],
    } as any;

    deviceRepo.findOne.mockResolvedValue(existingDevice);
    // Returns what it was given: mocking its result would hide a lost field.
    deviceRepo.save.mockImplementation(async (d) => d as any);

    const payload = { brand: 'Apple', model: 'iPhone 13' };
    const result = await service.updateDevice(1, payload);

    expect(deviceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ brand: 'Apple', model: 'iPhone 13' }),
    );
    expect(result.brand).toBe('Apple');
    expect(result.model).toBe('iPhone 13');
  });

  it('updateDevice deletes the old properties in the transaction of the save', async () => {
    // A save refused by a unique index (an EAN another device holds) must not
    // leave the device without its properties.
    deviceRepo.findOne.mockResolvedValue({
      device_id: 1,
      technicalProperties: [{ property_name: 'old', property_value: 'v' }],
      categories: [],
    } as any);
    deviceTechRepo.create.mockImplementation((p) => p as any);
    const manager = {
      delete: jest.fn(),
      save: jest.fn().mockRejectedValue(new Error('devices_ean_unique_idx')),
    };
    deviceRepo.manager.transaction.mockImplementation(async (work) =>
      work(manager),
    );

    await expect(
      service.updateDevice(1, {
        ean: '8806094688085',
        technicalProperties: [{ property_name: 'new', property_value: 'v' }],
      } as any),
    ).rejects.toThrow('devices_ean_unique_idx');

    expect(manager.delete).toHaveBeenCalledWith(DeviceTechnicalProperty, {
      device: { device_id: 1 },
    });
    expect(deviceTechRepo.delete).not.toHaveBeenCalled();
  });

  it('updateDevice leaves relations alone when the payload sends them as null', async () => {
    const technicalProperties = [{ property_name: 'old', property_value: 'v' }];
    const categories = [{ id: 1, name: 'Laptop' }];
    deviceRepo.findOne.mockResolvedValue({
      device_id: 1,
      brand: 'Samsung',
      technicalProperties,
      categories,
    } as any);
    deviceRepo.save.mockImplementation(async (d) => d as any);

    await service.updateDevice(1, {
      brand: 'Apple',
      technicalProperties: null,
      informationalProperties: null,
      categories: null,
    } as any);

    const saved = deviceRepo.save.mock.calls[0][0] as any;
    expect(saved.brand).toBe('Apple');
    expect(saved.technicalProperties).toBe(technicalProperties);
    expect(saved.categories).toBe(categories);
    expect(saved).not.toHaveProperty('informationalProperties', null);
  });

  it('updateDevice should save scalars alongside the loaded categories', async () => {
    const existingDevice = {
      device_id: 1,
      brand: 'Samsung',
      model: 'S21',
      technicalProperties: [],
      categories: [{ id: 1, name: 'old' }],
    } as any;
    const category = { id: 2, name: 'new' } as any;

    deviceRepo.findOne.mockResolvedValue(existingDevice);
    deviceRepo.save.mockImplementation(async (d) => d as any);
    deviceCategoryRepo.find.mockResolvedValue([category]);

    await service.updateDevice(1, {
      ean: '8806094688085',
      model: 'Galaxy S23',
      categories: [2],
    } as any);

    const saved = deviceRepo.save.mock.calls[0][0] as any;
    expect(saved.ean).toBe('8806094688085');
    expect(saved.model).toBe('Galaxy S23');
    expect(saved.categories).toEqual([category]);
  });

  it('updateDevice should update technical properties', async () => {
    const existingDevice = {
      device_id: 1,
      brand: 'Samsung',
      technicalProperties: [{ property_name: 'old', property_value: 'value' }],
      categories: [],
    } as any;

    deviceRepo.findOne.mockResolvedValue(existingDevice);
    deviceRepo.save.mockResolvedValue(existingDevice);
    deviceTechRepo.delete.mockResolvedValue({} as any);
    deviceTechRepo.create.mockImplementation((p) => p as any);

    const payload = {
      technicalProperties: [
        { property_name: 'new', property_value: 'newvalue' },
      ],
    } as any;

    await service.updateDevice(1, payload);

    expect(deviceTechRepo.delete).toHaveBeenCalledWith({
      device: { device_id: 1 },
    });
    expect(deviceTechRepo.create).toHaveBeenCalled();
  });

  it('findAllV2 should return paginated devices', async () => {
    const devices = [{ device_id: 1 }, { device_id: 2 }];
    const queryBuilderMock = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(5),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      // First call returns the device ids, later ones the category facet rows
      getRawMany: jest
        .fn()
        .mockResolvedValueOnce([{ device_device_id: 1 }, { device_device_id: 2 }])
        .mockResolvedValue([]),
      orderBy: jest.fn().mockReturnThis(),
    } as any;

    deviceRepo.createQueryBuilder.mockReturnValue(queryBuilderMock);
    deviceRepo.find.mockResolvedValue(devices as Device[]);

    const result = await service.findAllV2({ page: 1, limit: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(5);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(2);
    expect(result.pagination.totalPages).toBe(3);
    expect(deviceRepo.find).toHaveBeenCalled();
  });

  it('findAllV2 should load properties when withProperties is true', async () => {
    const devices = [{ device_id: 1 }];
    const queryBuilderMock = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      // First call returns the device ids, later ones the category facet rows
      getRawMany: jest
        .fn()
        .mockResolvedValueOnce([{ device_device_id: 1 }])
        .mockResolvedValue([]),
      orderBy: jest.fn().mockReturnThis(),
    } as any;

    deviceRepo.createQueryBuilder.mockReturnValue(queryBuilderMock);
    deviceRepo.find.mockResolvedValue(devices as Device[]);

    await service.findAllV2({ page: 1, limit: 10, withProperties: true });

    // Expect find to be called with relations
    expect(deviceRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: expect.arrayContaining([
          'categories',
          'technicalProperties',
          'informationalProperties',
        ]),
        relationLoadStrategy: 'query',
      }),
    );
  });

  it('findAllV2 should NOT load properties when withProperties is false', async () => {
    const devices = [{ device_id: 1 }];
    const queryBuilderMock = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      // First call returns the device ids, later ones the category facet rows
      getRawMany: jest
        .fn()
        .mockResolvedValueOnce([{ device_device_id: 1 }])
        .mockResolvedValue([]),
      orderBy: jest.fn().mockReturnThis(),
    } as any;

    deviceRepo.createQueryBuilder.mockReturnValue(queryBuilderMock);
    deviceRepo.find.mockResolvedValue(devices as Device[]);

    await service.findAllV2({ page: 1, limit: 10, withProperties: false });

    // Expect find to be called with ONLY categories
    expect(deviceRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: ['categories'],
        relationLoadStrategy: 'query',
      }),
    );

    const findCall = deviceRepo.find.mock.calls.find((call) =>
      call[0].relations.includes('categories'),
    );
    expect(findCall[0].relations).not.toContain('technicalProperties');
    expect(findCall[0].relations).not.toContain('informationalProperties');
  });

  it('findAllV2 should apply search filter', async () => {
    const queryBuilderMock = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValueOnce([{ device_device_id: 1 }])
        .mockResolvedValue([]),
      orderBy: jest.fn().mockReturnThis(),
    } as any;

    deviceRepo.createQueryBuilder.mockReturnValue(queryBuilderMock);
    deviceRepo.find.mockResolvedValue([
      { device_id: 1, brand: 'Apple' },
    ] as Device[]);

    const result = await service.findAllV2({
      page: 1,
      limit: 10,
      search: 'Apple',
    });

    expect(queryBuilderMock.andWhere).toHaveBeenCalled();
    expect(queryBuilderMock.distinct).toHaveBeenCalledWith(true);
    expect(queryBuilderMock.leftJoin).toHaveBeenCalledWith(
      'device.categories',
      'category',
    );
    expect(result.data).toHaveLength(1);
  });

  it('updateDevice should update categories', async () => {
    const existingDevice = {
      device_id: 1,
      brand: 'Samsung',
      technicalProperties: [],
      categories: [{ id: 1, name: 'old' }],
    } as any;

    const category = { id: 2, name: 'new' } as any;

    deviceRepo.findOne.mockResolvedValue(existingDevice);
    deviceRepo.save.mockResolvedValue(existingDevice);
    deviceCategoryRepo.find.mockResolvedValue([category]);

    const payload = {
      categories: [2], // ID instead of name
    } as any;

    await service.updateDevice(1, payload);

    expect(deviceCategoryRepo.find).toHaveBeenCalledWith({
      where: { id: expect.anything() },
    });
  });

  it('updateDevice should use existing category if found', async () => {
    const existingDevice = {
      device_id: 1,
      brand: 'Samsung',
      technicalProperties: [],
      categories: [],
    } as any;

    const existingCategory = { id: 1, name: 'existing' } as any;

    deviceRepo.findOne.mockResolvedValue(existingDevice);
    deviceRepo.save.mockResolvedValue(existingDevice);
    deviceCategoryRepo.find.mockResolvedValue([existingCategory]);

    const payload = {
      categories: [1], // ID instead of name
    } as any;

    await service.updateDevice(1, payload);

    expect(deviceCategoryRepo.find).toHaveBeenCalledWith({
      where: { id: expect.anything() },
    });
  });

  it('createDevice should use existing category if found', async () => {
    const existingCategory = { id: 1, name: 'Smartphone' } as any;
    const device = {
      device_id: 1,
      brand: 'Samsung',
      categories: [existingCategory],
    } as any;

    deviceRepo.create.mockReturnValue(device);
    deviceRepo.save.mockResolvedValue(device);
    deviceRepo.findOne.mockResolvedValue(device);
    deviceRepo.update.mockResolvedValue({} as any);
    deviceCategoryRepo.find.mockResolvedValue([existingCategory]);

    const payload = {
      brand: 'Samsung',
      categories: [1], // ID instead of name
    } as any;

    const result = await service.createDevice(payload);

    expect(deviceCategoryRepo.find).toHaveBeenCalledWith({
      where: { id: expect.anything() },
    });
    expect(result.categories).toContainEqual(existingCategory);
  });
});
