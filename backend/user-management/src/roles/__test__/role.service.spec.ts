/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from '../role.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from '../role.entity';
import { Permission } from '../../permissions/permission.entity';

const mockRoleRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});
const mockPermissionRepository = () => ({
  findBy: jest.fn(),
  findOne: jest.fn(),
});

describe('RoleService', () => {
  let service: RoleService;
  let roleRepo: ReturnType<typeof mockRoleRepository>;
  let permissionRepo: ReturnType<typeof mockPermissionRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: getRepositoryToken(Role), useFactory: mockRoleRepository },
        {
          provide: getRepositoryToken(Permission),
          useFactory: mockPermissionRepository,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    roleRepo = module.get(getRepositoryToken(Role));
    permissionRepo = module.get(getRepositoryToken(Permission));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a role with permissions', async () => {
      const name = 'ADMIN';
      const permissionNames = ['READ', 'WRITE'];
      const permissions = [
        { id: 1, name: 'READ' },
        { id: 2, name: 'WRITE' },
      ];
      const role = { id: 1, name, permissions };

      permissionRepo.findBy.mockResolvedValue(permissions);
      roleRepo.create.mockReturnValue(role);
      roleRepo.save.mockResolvedValue(role);

      const result = await service.create(name, permissionNames);

      expect(permissionRepo.findBy).toHaveBeenCalledWith({
        name: expect.any(Object),
      });
      expect(roleRepo.create).toHaveBeenCalledWith({ name, permissions });
      expect(roleRepo.save).toHaveBeenCalledWith(role);
      expect(result).toEqual(role);
    });
  });

  describe('findAll', () => {
    it('should return all roles', async () => {
      const roles = [
        { id: 1, name: 'USER' },
        { id: 2, name: 'ADMIN' },
      ];
      roleRepo.find.mockResolvedValue(roles);

      const result = await service.findAll();

      expect(roleRepo.find).toHaveBeenCalled();
      expect(result).toEqual(roles);
    });
  });

  describe('findByName', () => {
    it('should return role with permissions if found', async () => {
      const role = { id: 1, name: 'USER', permissions: [] };
      roleRepo.findOne.mockResolvedValue(role);

      const result = await service.findByName('USER');

      expect(roleRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'USER' },
        relations: ['permissions'],
      });
      expect(result).toEqual(role);
    });
  });

  describe('addPermission', () => {
    it('should add permission to role and save', async () => {
      const roleId = '1';
      const permissionName = 'EDIT';
      const role = { id: 1, name: 'USER', permissions: [] };
      const permission = { id: 2, name: permissionName };
      const updatedRole = { ...role, permissions: [permission] };

      roleRepo.findOne.mockResolvedValue(role);
      permissionRepo.findOne.mockResolvedValue(permission);
      roleRepo.save.mockResolvedValue(updatedRole);

      const result = await service.addPermission(roleId, permissionName);

      expect(roleRepo.findOne).toHaveBeenCalledWith({
        where: { id: Number(roleId) },
      });
      expect(permissionRepo.findOne).toHaveBeenCalledWith({
        where: { name: permissionName },
      });
      expect(roleRepo.save).toHaveBeenCalledWith({
        ...role,
        permissions: [permission],
      });
      expect(result).toEqual(updatedRole);
    });

    it('should throw if role not found', async () => {
      roleRepo.findOne.mockResolvedValue(null);

      await expect(service.addPermission('1', 'EDIT')).rejects.toThrow(
        'Role not found',
      );
    });

    it('should throw if permission not found', async () => {
      const role = { id: 1, name: 'USER', permissions: [] };
      roleRepo.findOne.mockResolvedValue(role);
      permissionRepo.findOne.mockResolvedValue(null);

      await expect(service.addPermission('1', 'EDIT')).rejects.toThrow(
        'Permission not found',
      );
    });
  });
});
