import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { OwnershipController } from '../ownership.controller';
import { OwnershipService } from '../ownership.service';

const mockOwnershipService = {
  getUserDevices: jest.fn(),
  assignDeviceToUser: jest.fn(),
};

describe('OwnershipController', () => {
  let controller: OwnershipController;
  let service: typeof mockOwnershipService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OwnershipController],
      providers: [
        { provide: OwnershipService, useValue: mockOwnershipService },
      ],
    }).compile();
    controller = module.get<OwnershipController>(OwnershipController);
    service = module.get(OwnershipService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get user devices', async () => {
    const data = { userId: 1, requesterId: 1, isAdmin: false };
    const devices = [{ id: 1 }];
    service.getUserDevices.mockResolvedValue(devices);
    const result = await controller.getUserDevices(data);
    expect(service.getUserDevices).toHaveBeenCalledWith(1, 1, false);
    expect(result).toEqual(devices);
  });

  it('should assign device to user', async () => {
    const data = {
      deviceId: 1,
      modelId: 953560,
      userId: 1,
      acquiredAt: new Date(),
      requesterId: 1,
      isAdmin: false,
    };
    const ownership = { id: 1 };
    service.assignDeviceToUser.mockResolvedValue(ownership);
    const result = await controller.assignDeviceToUser(data);
    expect(service.assignDeviceToUser).toHaveBeenCalledWith(
      data.deviceId,
      data.userId,
      data.acquiredAt,
      data.requesterId,
      data.isAdmin,
      data.modelId,
    );
    expect(result).toEqual(ownership);
  });

  it('sends a refusal with its status, not as an internal error', async () => {
    service.getUserDevices.mockRejectedValue(
      new ForbiddenException('Access denied'),
    );
    await expect(
      controller.getUserDevices({ userId: 2, requesterId: 1, isAdmin: false }),
    ).rejects.toEqual(
      new RpcException({ status: 403, message: 'Access denied' }),
    );
  });
});
