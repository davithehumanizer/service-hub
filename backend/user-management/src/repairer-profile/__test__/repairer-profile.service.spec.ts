import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { RepairerProfileService } from '../repairer-profile.service';
import { RepairerProfile } from '../repairer-profile.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('RepairerProfileService', () => {
  let service: RepairerProfileService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepairerProfileService,
        { provide: getRepositoryToken(RepairerProfile), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<RepairerProfileService>(RepairerProfileService);
    repo = module.get(getRepositoryToken(RepairerProfile));
  });

  describe('findByUserId', () => {
    it('should return the profile when found', async () => {
      const profile = { id: 1, businessName: 'Fix It' } as RepairerProfile;
      repo.findOne.mockResolvedValue(profile);

      const result = await service.findByUserId(1);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { user: { id: 1 } },
        relations: ['user'],
      });
      expect(result).toEqual(profile);
    });

    it('should return null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.findByUserId(99);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should update and save if profile already exists', async () => {
      const existing = { id: 1, businessName: 'Old Name' } as RepairerProfile;
      const updated = { id: 1, businessName: 'New Name' } as RepairerProfile;
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue(updated);

      const result = await service.create(1, { businessName: 'New Name' });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ businessName: 'New Name' }),
      );
      expect(result).toEqual(updated);
    });

    it('should create and save a new profile if none exists', async () => {
      const newProfile = {
        id: 2,
        businessName: 'Brand New',
      } as RepairerProfile;
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(newProfile);
      repo.save.mockResolvedValue(newProfile);

      const result = await service.create(2, { businessName: 'Brand New' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ businessName: 'Brand New' }),
      );
      expect(repo.save).toHaveBeenCalledWith(newProfile);
      expect(result).toEqual(newProfile);
    });

    it('should persist deviceSpecialties as English keys', async () => {
      const specialties = ['Smartphones', 'Laptops', 'Bicycles / E-bikes'];
      const newProfile = {
        id: 3,
        businessName: 'Tech Repair',
        deviceSpecialties: specialties,
      } as RepairerProfile;
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(newProfile);
      repo.save.mockResolvedValue(newProfile);

      const result = await service.create(3, {
        businessName: 'Tech Repair',
        deviceSpecialties: specialties,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ deviceSpecialties: specialties }),
      );
      expect(result.deviceSpecialties).toEqual(specialties);
    });
  });

  describe('update', () => {
    it('should update and save the existing profile', async () => {
      const existing = { id: 1, businessName: 'Old' } as RepairerProfile;
      const saved = { id: 1, businessName: 'Updated' } as RepairerProfile;
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue(saved);

      const result = await service.update(1, { businessName: 'Updated' });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ businessName: 'Updated' }),
      );
      expect(result).toEqual(saved);
    });

    it('should update deviceSpecialties with English keys', async () => {
      const specialties = ['Tablets', 'Game consoles', 'Washing machines'];
      const existing = {
        id: 1,
        businessName: 'Fix It',
        deviceSpecialties: ['Smartphones'],
      } as RepairerProfile;
      const saved = {
        id: 1,
        businessName: 'Fix It',
        deviceSpecialties: specialties,
      } as RepairerProfile;
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue(saved);

      const result = await service.update(1, {
        deviceSpecialties: specialties,
      });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ deviceSpecialties: specialties }),
      );
      expect(result.deviceSpecialties).toEqual(specialties);
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update(99, { businessName: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
