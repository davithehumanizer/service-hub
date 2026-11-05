/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionController } from '../permission.controller';
import { PermissionService } from '../permission.service';

describe('PermissionController', () => {
  let permissionController: PermissionController;
  let permissionService: PermissionService;

  const mockPermissionService = {
    create: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PermissionController],
      providers: [
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
      ],
    }).compile();

    permissionController =
      moduleRef.get<PermissionController>(PermissionController);
    permissionService = moduleRef.get<PermissionService>(PermissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call permissionService.create with correct name', async () => {
      const permissionName = 'READ_USER';
      const createdPermission = { id: 1, name: permissionName };

      mockPermissionService.create.mockResolvedValue(createdPermission);

      const result = await permissionController.create(permissionName);

      expect(mockPermissionService.create).toHaveBeenCalledWith(permissionName);
      expect(result).toEqual(createdPermission);
    });
  });

  describe('findAll', () => {
    it('should return all permissions', async () => {
      const permissions = [
        { id: 1, name: 'READ_USER' },
        { id: 2, name: 'WRITE_USER' },
      ];

      mockPermissionService.findAll.mockResolvedValue(permissions);

      const result = await permissionController.findAll();

      expect(mockPermissionService.findAll).toHaveBeenCalled();
      expect(result).toEqual(permissions);
    });
  });
});
