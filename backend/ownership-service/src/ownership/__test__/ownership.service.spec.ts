import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OwnershipService } from '../ownership.service';
import { Ownership } from '../ownership.entity';
import { ForbiddenException } from '@nestjs/common';

const mockOwnershipRepo = () => ({
  find: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('OwnershipService', () => {
  let service: OwnershipService;
  let ownershipRepo: ReturnType<typeof mockOwnershipRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnershipService,
        {
          provide: getRepositoryToken(Ownership),
          useFactory: mockOwnershipRepo,
        },
      ],
    }).compile();
    service = module.get<OwnershipService>(OwnershipService);
    ownershipRepo = module.get(getRepositoryToken(Ownership));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserDevices', () => {
    it('should throw if not owner or admin', async () => {
      await expect(service.getUserDevices(1, 2, false)).rejects.toThrow(
        ForbiddenException,
      );
    });
    it('should return devices if owner', async () => {
      const devices = [{ id: 1 }];
      ownershipRepo.find.mockResolvedValue(devices);
      const result = await service.getUserDevices(1, 1, false);
      expect(result).toEqual(devices);
    });
    it('should return devices if admin', async () => {
      const devices = [{ id: 2 }];
      ownershipRepo.find.mockResolvedValue(devices);
      const result = await service.getUserDevices(1, 2, true);
      expect(result).toEqual(devices);
    });
    it('lists one row per catalogue device, as the v1 routes read them', async () => {
      // Two of the same variant, as /api/v2/personal-devices allows.
      ownershipRepo.find.mockResolvedValue([
        { id: 'a', deviceId: 5 },
        { id: 'b', deviceId: 5 },
        { id: 'c', deviceId: 6 },
      ]);
      const result = await service.getUserDevices(1, 1, false);
      expect(result.map((o) => o.id)).toEqual(['a', 'c']);
      // Without a variant, a personal device is not one of them.
      expect(ownershipRepo.find.mock.calls[0][0].where.deviceId).toBeDefined();
    });
  });

  describe('assignDeviceToUser', () => {
    it('should throw if not owner or admin', async () => {
      await expect(
        service.assignDeviceToUser(1, 2, new Date(), 3, false),
      ).rejects.toThrow(ForbiddenException);
    });
    it('should return existing ownership if already exists', async () => {
      const existing = { id: 1 };
      ownershipRepo.findOneBy.mockResolvedValue(existing);
      const result = await service.assignDeviceToUser(
        1,
        1,
        new Date(),
        1,
        false,
      );
      expect(result).toEqual(existing);
    });
    it('records the model the gateway gives', async () => {
      ownershipRepo.findOneBy.mockResolvedValue(null);
      ownershipRepo.save.mockImplementation(async (o) => o);
      await service.assignDeviceToUser(10, 1, new Date(), 1, false, 953560);
      expect(ownershipRepo.create.mock.calls[0][0]).toMatchObject({
        deviceId: 10,
        modelId: 953560,
      });
    });
    it('should create and save new ownership if not exists', async () => {
      ownershipRepo.findOneBy.mockResolvedValue(null);
      const ownership = { id: 2 };
      ownershipRepo.create.mockReturnValue(ownership);
      ownershipRepo.save.mockResolvedValue(ownership);
      const result = await service.assignDeviceToUser(
        1,
        1,
        new Date(),
        1,
        false,
      );
      expect(result).toEqual(ownership);
    });
  });
});
