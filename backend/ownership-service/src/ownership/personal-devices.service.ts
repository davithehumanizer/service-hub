import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ownership } from './ownership.entity';

/** What a user may change of a personal device. */
export interface PersonalDeviceChanges {
  modelId?: number;
  deviceId?: number | null;
  nickname?: string | null;
  visualCondition?: string;
  usageIntensity?: string;
  acquiredAt?: Date;
}

// TypeORM leaves a null or undefined key out of `where`: without an owner,
// the query would match every user's devices.
const owner = (userId: number): number => {
  if (!Number.isInteger(userId)) {
    throw new ForbiddenException('A personal device belongs to a user');
  }
  return userId;
};

/**
 * Personal devices: a user's own ones, of a model and of one of its
 * variants when known. Unlike assign_device_to_user, two identical ones may
 * be added, when asked for, so a device is designated by its own id, never
 * by its variant. The gateway checks the model and the variant beforehand.
 */
@Injectable()
export class PersonalDevicesService {
  constructor(
    @InjectRepository(Ownership)
    private readonly ownerships: Repository<Ownership>,
  ) {}

  list(userId: number): Promise<Ownership[]> {
    return this.ownerships.find({
      where: { userId: owner(userId) },
      order: { acquiredAt: 'DESC', id: 'ASC' },
    });
  }

  /** Someone else's device is not found, whether it exists or not. */
  async get(id: string, userId: number): Promise<Ownership> {
    const device = await this.ownerships.findOne({
      where: { id, userId: owner(userId) },
    });
    if (!device) throw new NotFoundException(`Personal device ${id} not found`);
    return device;
  }

  /**
   * A second device of a model the user has is made only when asked for
   * (`another`): two identical phones exist, but a repeated click on "Add"
   * is not one of them.
   */
  async create(
    userId: number,
    device: PersonalDeviceChanges & { modelId: number; another?: boolean },
  ): Promise<Ownership> {
    const owned = await this.ownerships.count({
      where: { userId: owner(userId), modelId: device.modelId },
    });
    if (owned > 0 && !device.another) {
      throw new ConflictException('You already have a device of this model');
    }
    return this.ownerships.save(
      this.ownerships.create({
        userId,
        modelId: device.modelId,
        deviceId: device.deviceId ?? null,
        nickname: device.nickname ?? null,
        visualCondition: device.visualCondition,
        usageIntensity: device.usageIntensity,
        acquiredAt: device.acquiredAt ?? new Date(),
      }),
    );
  }

  async update(
    id: string,
    userId: number,
    changes: PersonalDeviceChanges,
  ): Promise<Ownership> {
    const device = await this.get(id, userId);
    const defined = Object.entries(changes).filter(([, v]) => v !== undefined);
    Object.assign(device, Object.fromEntries(defined));
    return this.ownerships.save(device);
  }

  async remove(id: string, userId: number): Promise<{ success: true }> {
    await this.ownerships.remove(await this.get(id, userId));
    return { success: true };
  }
}
