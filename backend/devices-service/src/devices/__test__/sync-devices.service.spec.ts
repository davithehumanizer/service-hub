import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Device } from '../../entity/device.entity';
import { SyncDevicesService } from '../services/sync-devices.service';

describe('SyncDevicesService', () => {
  let service: SyncDevicesService;
  let repository: any;

  let mockQueryBuilder: any;
  let mockRepository: any;

  beforeEach(async () => {
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mockRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncDevicesService,
        {
          provide: getRepositoryToken(Device),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SyncDevicesService>(SyncDevicesService);
    repository = module.get(getRepositoryToken(Device));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTotalCount', () => {
    it('should return total count', async () => {
      mockRepository.count.mockResolvedValue(100);
      const result = await service.getTotalCount();
      expect(result).toBe(100);
      expect(mockRepository.count).toHaveBeenCalled();
    });
  });

  describe('getIdRange', () => {
    it('should return min and max ids', async () => {
      const mockQueryBuilder = mockRepository.createQueryBuilder();
      mockQueryBuilder.getRawOne.mockResolvedValue({ minId: 1, maxId: 500 });

      const result = await service.getIdRange();
      expect(result).toEqual({ minId: 1, maxId: 500 });
    });
  });

  describe('fetchBatch', () => {
    it('should fetch a batch of devices', async () => {
      const mockDevices = [{ device_id: 1 }, { device_id: 2 }];
      const mockQueryBuilder = mockRepository.createQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue(mockDevices);

      const result = await service.fetchBatch(0, 10);
      expect(result.devices).toEqual(mockDevices);
      expect(result.nextLastId).toBe(2);
    });

    it('should return same lastId if no devices found', async () => {
      const mockQueryBuilder = mockRepository.createQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.fetchBatch(10, 10);
      expect(result.devices).toEqual([]);
      expect(result.nextLastId).toBe(10);
    });
  });
});
