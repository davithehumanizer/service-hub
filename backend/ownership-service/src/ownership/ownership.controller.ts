import { Controller, HttpException } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { OwnershipService } from './ownership.service';
import { Ownership } from './ownership.entity';

// An HttpException thrown here would reach the gateway as "Internal server
// error": its status and message travel instead, for the gateway to answer.
const rpc = async <T>(work: () => Promise<T>): Promise<T> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof HttpException) {
      throw new RpcException({
        status: error.getStatus(),
        message: error.message,
      });
    }
    throw error;
  }
};

@Controller()
export class OwnershipController {
  constructor(private readonly ownershipService: OwnershipService) {}

  @MessagePattern({ cmd: 'get_user_devices' })
  async getUserDevices(
    @Payload()
    data: {
      userId: number;
      requesterId: number;
      isAdmin: boolean;
    },
  ): Promise<Ownership[]> {
    const { userId, requesterId, isAdmin } = data;
    console.log('getUserDevices', data);
    return rpc(() =>
      this.ownershipService.getUserDevices(userId, requesterId, isAdmin),
    );
  }

  @MessagePattern({ cmd: 'assign_device_to_user' })
  async assignDeviceToUser(
    @Payload()
    data: {
      deviceId: number;
      modelId?: number | null;
      userId: number;
      acquiredAt?: Date;
      requesterId: number;
      isAdmin: boolean;
    },
  ): Promise<Ownership> {
    const { deviceId, modelId, userId, acquiredAt, requesterId, isAdmin } =
      data;
    console.log('assignDeviceToUser', data);
    const acquiredAtDate = acquiredAt ?? new Date();
    return rpc(() =>
      this.ownershipService.assignDeviceToUser(
        deviceId,
        userId,
        acquiredAtDate,
        requesterId,
        isAdmin,
        modelId,
      ),
    );
  }

  @MessagePattern({ cmd: 'remove_device_from_user' })
  async removeDeviceFromUser(
    @Payload()
    data: {
      deviceId: number;
      requesterId: number;
      isAdmin: boolean;
    },
  ): Promise<{ success: boolean }> {
    const { deviceId, requesterId, isAdmin } = data;
    await rpc(() =>
      this.ownershipService.removeDeviceFromUser(
        deviceId,
        requesterId,
        isAdmin,
      ),
    );
    return { success: true };
  }
}
