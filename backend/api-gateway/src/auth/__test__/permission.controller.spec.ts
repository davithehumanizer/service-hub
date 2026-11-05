import { Test, TestingModule } from '@nestjs/testing';
import { PermissionController } from '../permission.controller';
import { of } from 'rxjs';
import { RoleCacheService } from 'src/roles/role-cache.service';
import { mockAuthService } from './mocks/auth-service.mock';

describe('PermissionController', () => {
  let controller: PermissionController;
  const mockClientProxy = { send: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionController],
      providers: [
        { provide: 'USER_SERVICE', useValue: mockClientProxy },
        mockAuthService(),
        {
          provide: RoleCacheService,
          useValue: {
            getRoles: jest.fn(),
          },
        },
      ],
    }).compile();
    controller = module.get<PermissionController>(PermissionController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create permission', async () => {
    const body = { name: 'perm' };
    mockClientProxy.send.mockReturnValue(of({ created: true }));
    const result = await controller.createPermission(body);
    expect(result).toEqual({ created: true });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'create_permission' },
      body,
    );
  });

  it('should find all permissions', async () => {
    mockClientProxy.send.mockReturnValue(of([{ id: 1 }]));
    const result = await controller.findAllPermissions();
    expect(result).toEqual([{ id: 1 }]);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'find_all_permissions' },
      {},
    );
  });
});
