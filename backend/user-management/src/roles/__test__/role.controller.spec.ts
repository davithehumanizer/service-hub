/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { RoleController } from '../role.controller';
import { RoleService } from '../role.service';

describe('RoleController', () => {
  let controller: RoleController;
  let service: RoleService;

  const mockRoleService = {
    create: jest.fn(),
    findAll: jest.fn(),
    addPermission: jest.fn(),
    findByName: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        {
          provide: RoleService,
          useValue: mockRoleService,
        },
      ],
    }).compile();

    controller = module.get<RoleController>(RoleController);
    service = module.get<RoleService>(RoleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call RoleService.create with correct data', async () => {
      const data = { name: 'Admin', permissions: ['READ', 'WRITE'] };
      const result = { id: '1', ...data };

      mockRoleService.create.mockResolvedValue(result);

      const response = await controller.create(data);
      expect(service.create).toHaveBeenCalledWith('Admin', ['READ', 'WRITE']);
      expect(response).toEqual(result);
    });
  });

  describe('findAll', () => {
    it('should return all roles', async () => {
      const roles = [
        { id: '1', name: 'Admin', permissions: [] },
        { id: '2', name: 'User', permissions: [] },
      ];
      mockRoleService.findAll.mockResolvedValue(roles);

      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(roles);
    });
  });

  describe('addPermission', () => {
    it('should call RoleService.addPermission with correct values', async () => {
      const data = { roleId: '1', permission: 'DELETE' };
      const result = { id: '1', name: 'Admin', permissions: ['DELETE'] };

      mockRoleService.addPermission.mockResolvedValue(result);

      const response = await controller.addPermission(data);
      expect(service.addPermission).toHaveBeenCalledWith('1', 'DELETE');
      expect(response).toEqual(result);
    });
  });

  describe('getRoleByName', () => {
    it('should call RoleService.findByName with the correct name', async () => {
      const data = { name: 'Admin' };
      const result = { id: '1', name: 'Admin', permissions: [] };

      mockRoleService.findByName.mockResolvedValue(result);

      const response = await controller.getRoleByName(data);
      expect(service.findByName).toHaveBeenCalledWith('Admin');
      expect(response).toEqual(result);
    });
  });
});
