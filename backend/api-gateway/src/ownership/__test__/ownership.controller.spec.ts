import { Test, TestingModule } from '@nestjs/testing';
import { OwnershipController } from '../ownership.controller';
import { HttpException } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { RoleCacheService } from '../../roles/role-cache.service';
import { mockAuthService } from 'src/auth/__test__/mocks/auth-service.mock';
import { DeviceModelResolver } from 'src/devices/device-model-resolver.service';

describe('OwnershipController', () => {
  let controller: OwnershipController;
  let app: TestingModule;
  const mockClientProxy = { send: jest.fn() };
  const resolver = { resolve: jest.fn() };

  beforeEach(async () => {
    app = await Test.createTestingModule({
      controllers: [OwnershipController],
      providers: [
        { provide: 'OWNERSHIP_SERVICE', useValue: mockClientProxy },
        { provide: DeviceModelResolver, useValue: resolver },
        mockAuthService(),
        {
          provide: RoleCacheService,
          useValue: {
            getRoles: jest.fn(),
            // add other mocked methods if needed
          },
        },
      ],
    }).compile();
    controller = app.get<OwnershipController>(OwnershipController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get user devices', () => {
    mockClientProxy.send.mockReturnValue(of(['device']));
    const req = { user: { id: 1, role: 'admin' } };
    const result$ = controller.getUserDevices(req, 1);
    result$.subscribe((result) => {
      expect(result).toEqual(['device']);
    });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'get_user_devices' },
      { userId: 1, requesterId: 1, isAdmin: true },
    );
  });

  it('should assign device to user (admin)', (done) => {
    const req = { user: { id: 1, role: 'admin' } };
    const assignData = { deviceId: 10, userId: 2, acquiredAt: '2024-01-01' };
    resolver.resolve.mockResolvedValue({ modelId: 953560, deviceId: 10 });
    mockClientProxy.send.mockReturnValue(of({ success: true }));
    const result$ = controller.assignDeviceToUser(req, assignData as any);
    result$.subscribe(() => {
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'assign_device_to_user' },
        {
          deviceId: 10,
          modelId: 953560,
          userId: 2,
          acquiredAt: '2024-01-01',
          requesterId: 1,
          isAdmin: true,
        },
      );
      done();
    });
  });

  it('adds a device the catalogue cannot place yet, without its model', async () => {
    const req = { user: { id: 1, role: 'admin' } };
    resolver.resolve.mockRejectedValue(new HttpException('no model yet', 400));
    mockClientProxy.send.mockReturnValue(of({ id: 'o' }));

    await lastValueFrom(
      controller.assignDeviceToUser(req, { deviceId: 10, userId: 1 } as any),
    );

    expect(mockClientProxy.send.mock.calls[0][1].modelId).toBeNull();
  });

  it('recognises an administrator from the role a signed-in token carries', async () => {
    mockClientProxy.send.mockReturnValue(of([]));
    const asAdmin = { user: { id: 1, role: { id: 4, name: 'admin' } } };
    const asUser = { user: { id: 5, role: { id: 2, name: 'user' } } };

    await lastValueFrom(controller.getUserDevices(asAdmin, 2));
    await lastValueFrom(controller.getUserDevices(asUser, 5));

    expect(mockClientProxy.send.mock.calls.map(([, p]) => p.isAdmin)).toEqual([
      true,
      false,
    ]);
  });

  it('should remove device from user (non-admin)', (done) => {
    const req = { user: { id: 5, role: 'user' } };
    const removeData = { deviceId: 10, userId: 2 };
    mockClientProxy.send.mockReturnValue(of({ success: true }));
    const result$ = controller.removeDeviceFromUser(req, removeData as any);
    result$.subscribe(() => {
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'remove_device_from_user' },
        { deviceId: 10, userId: 2, requesterId: 5, isAdmin: false },
      );
      done();
    });
  });

  it("answers ownership-service's refusal with its status", async () => {
    mockClientProxy.send.mockReturnValue(
      throwError(() => ({ status: 403, message: 'Access denied' })),
    );
    const req = { user: { id: 5, role: { name: 'user' } } };

    await expect(
      lastValueFrom(controller.getUserDevices(req, 1)),
    ).rejects.toEqual(new HttpException('Access denied', 403));
  });

  it('keeps any other failure an internal error', async () => {
    mockClientProxy.send.mockReturnValue(
      throwError(() => ({ status: 'error', message: 'boom' })),
    );
    const req = { user: { id: 5, role: { name: 'user' } } };

    await expect(
      lastValueFrom(controller.getUserDevices(req, 5)),
    ).rejects.toEqual(new HttpException('boom', 500));
  });
});
