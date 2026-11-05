import { Test, TestingModule } from '@nestjs/testing';
import { RoleController } from '../role.controller';
import { of } from 'rxjs';
import { RoleCacheService } from 'src/roles/role-cache.service';
import { mockAuthService } from './mocks/auth-service.mock';

describe('RoleController', () => {
  let controller: RoleController;
  const mockClientProxy = { send: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        { provide: 'USER_SERVICE', useValue: mockClientProxy },
        mockAuthService(),
        {
          provide: RoleCacheService,
          useValue: {
            getRoles: jest.fn(),
          },
        },
        {
          provide: RoleCacheService,
          useValue: {
            getRoles: jest.fn(),
          },
        },
      ],
    }).compile();
    controller = module.get<RoleController>(RoleController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create role', async () => {
    const body = { name: 'admin', permissions: ['read'] };
    mockClientProxy.send.mockReturnValue(of({ created: true }));
    const result = await controller.createRole(body);
    expect(result).toEqual({ created: true });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'create_role' },
      body,
    );
  });

  it('should find all roles', async () => {
    mockClientProxy.send.mockReturnValue(of([{ id: 1 }]));
    const result = await controller.findAllRoles();
    expect(result).toEqual([{ id: 1 }]);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'find_all_roles' },
      {},
    );
  });

  it('should add permission to role', async () => {
    const body = { roleId: '1', permission: 'read' };
    mockClientProxy.send.mockReturnValue(of({ updated: true }));
    const result = await controller.addPermission(body);
    expect(result).toEqual({ updated: true });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'add_permission' },
      body,
    );
  });
});
