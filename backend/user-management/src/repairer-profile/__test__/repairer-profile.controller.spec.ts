import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { RepairerProfileController } from '../repairer-profile.controller';
import { RepairerProfileService } from '../repairer-profile.service';
import { RepairerProfile } from '../repairer-profile.entity';

describe('RepairerProfileController', () => {
  let controller: RepairerProfileController;
  let service: jest.Mocked<RepairerProfileService>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<RepairerProfileService>> = {
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RepairerProfileController],
      providers: [{ provide: RepairerProfileService, useValue: mockService }],
    }).compile();

    controller = module.get<RepairerProfileController>(
      RepairerProfileController,
    );
    service = module.get(RepairerProfileService);
  });

  describe('getRepairerProfile', () => {
    it('should return the profile for the given userId', async () => {
      const profile = { id: 1, businessName: 'Fix It' } as RepairerProfile;
      service.findByUserId.mockResolvedValue(profile);

      const result = await controller.getRepairerProfile({ userId: 1 });

      expect(service.findByUserId).toHaveBeenCalledWith(1);
      expect(result).toEqual(profile);
    });

    it('should throw RpcException on service error', async () => {
      service.findByUserId.mockRejectedValue(new Error('DB error'));

      await expect(
        controller.getRepairerProfile({ userId: 1 }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('createRepairerProfile', () => {
    it('should create and return the profile', async () => {
      const profile = { id: 1, businessName: 'New Shop' } as RepairerProfile;
      service.create.mockResolvedValue(profile);

      const result = await controller.createRepairerProfile({
        userId: 1,
        profile: { businessName: 'New Shop' },
      });

      expect(service.create).toHaveBeenCalledWith(1, {
        businessName: 'New Shop',
      });
      expect(result).toEqual(profile);
    });

    it('should create profile with deviceSpecialties as English keys', async () => {
      const specialties = ['Smartphones', 'Laptops', 'Bicycles / E-bikes'];
      const profile = {
        id: 1,
        businessName: 'TechFix',
        deviceSpecialties: specialties,
      } as RepairerProfile;
      service.create.mockResolvedValue(profile);

      const result = await controller.createRepairerProfile({
        userId: 1,
        profile: { businessName: 'TechFix', deviceSpecialties: specialties },
      });

      expect(service.create).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ deviceSpecialties: specialties }),
      );
      expect(result.deviceSpecialties).toEqual(specialties);
    });

    it('should throw RpcException on service error', async () => {
      service.create.mockRejectedValue(new Error('Create failed'));

      await expect(
        controller.createRepairerProfile({
          userId: 1,
          profile: { businessName: 'X' },
        }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('updateRepairerProfile', () => {
    it('should update and return the profile', async () => {
      const profile = {
        id: 1,
        businessName: 'Updated Shop',
      } as RepairerProfile;
      service.update.mockResolvedValue(profile);

      const result = await controller.updateRepairerProfile({
        userId: 1,
        profile: { businessName: 'Updated Shop' },
      });

      expect(service.update).toHaveBeenCalledWith(1, {
        businessName: 'Updated Shop',
      });
      expect(result).toEqual(profile);
    });

    it('should throw RpcException on service error', async () => {
      service.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        controller.updateRepairerProfile({
          userId: 1,
          profile: { businessName: 'X' },
        }),
      ).rejects.toThrow(RpcException);
    });
  });
});
