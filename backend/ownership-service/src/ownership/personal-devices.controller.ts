import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import {
  PersonalDeviceChanges,
  PersonalDevicesService,
} from './personal-devices.service';

// An HttpException thrown here would reach the gateway as "Internal server
// error": its message and its status are passed on instead.
const rpc = async <T>(work: () => Promise<T>): Promise<T> => {
  try {
    return await work();
  } catch (error) {
    throw new RpcException({
      message: (error as Error).message,
      status: (error as { status?: number }).status,
    });
  }
};

/** Personal devices, over TCP, for the gateway's /api/v2/personal-devices. */
@Controller()
export class PersonalDevicesController {
  constructor(private readonly devices: PersonalDevicesService) {}

  @MessagePattern({ cmd: 'list_personal_devices' })
  list(@Payload() { userId }: { userId: number }) {
    return rpc(() => this.devices.list(userId));
  }

  @MessagePattern({ cmd: 'get_personal_device' })
  get(@Payload() { id, userId }: { id: string; userId: number }) {
    return rpc(() => this.devices.get(id, userId));
  }

  @MessagePattern({ cmd: 'create_personal_device' })
  create(
    @Payload()
    {
      userId,
      device,
    }: {
      userId: number;
      device: PersonalDeviceChanges & { modelId: number; another?: boolean };
    },
  ) {
    return rpc(() => this.devices.create(userId, revive(device)));
  }

  @MessagePattern({ cmd: 'update_personal_device' })
  update(
    @Payload()
    {
      id,
      userId,
      changes,
    }: {
      id: string;
      userId: number;
      changes: PersonalDeviceChanges;
    },
  ) {
    return rpc(() => this.devices.update(id, userId, revive(changes)));
  }

  @MessagePattern({ cmd: 'delete_personal_device' })
  remove(@Payload() { id, userId }: { id: string; userId: number }) {
    return rpc(() => this.devices.remove(id, userId));
  }
}

// A date travels over TCP as a string.
const revive = <T extends { acquiredAt?: Date | string }>(changes: T): T => ({
  ...changes,
  ...(changes.acquiredAt !== undefined
    ? { acquiredAt: new Date(changes.acquiredAt) }
    : {}),
});
