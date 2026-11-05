import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PermissionService } from '../permission.service';
import { Permission } from '../permission.entity';

const mockPermissionRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

describe('PermissionService', () => {
  let service: PermissionService;
  let permissionRepo: ReturnType<typeof mockPermissionRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: getRepositoryToken(Permission),
          useFactory: mockPermissionRepository,
        },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    permissionRepo = module.get(getRepositoryToken(Permission));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a permission', async () => {
      const name = 'READ';
      const permission = { id: 1, name };
      permissionRepo.create.mockReturnValue(permission);
      permissionRepo.save.mockResolvedValue(permission);

      const result = await service.create(name);

      expect(permissionRepo.create).toHaveBeenCalledWith({ name });
      expect(permissionRepo.save).toHaveBeenCalledWith(permission);
      expect(result).toEqual(permission);
    });
  });

  describe('findAll', () => {
    it('should return all permissions', async () => {
      const permissions = [
        { id: 1, name: 'READ' },
        { id: 2, name: 'WRITE' },
      ];
      permissionRepo.find.mockResolvedValue(permissions);

      const result = await service.findAll();

      expect(permissionRepo.find).toHaveBeenCalled();
      expect(result).toEqual(permissions);
    });
  });

  describe('findByName', () => {
    it('should return permission if found', async () => {
      const permission = { id: 1, name: 'READ' };
      permissionRepo.findOne.mockResolvedValue(permission);

      const result = await service.findByName('READ');

      expect(permissionRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'READ' },
      });
      expect(result).toEqual(permission);
    });

    it('should return null if permission not found', async () => {
      permissionRepo.findOne.mockResolvedValue(null);

      const result = await service.findByName('UNKNOWN');

      expect(permissionRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'UNKNOWN' },
      });
      expect(result).toBeNull();
    });
  });
});
