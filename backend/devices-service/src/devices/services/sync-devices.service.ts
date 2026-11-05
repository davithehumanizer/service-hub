import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../../entity/device.entity';

/**
 * Service dedicated to sync operations with optimized queries for large datasets.
 * Uses cursor-based pagination (device_id > lastId) instead of OFFSET for O(1) performance.
 */
@Injectable()
export class SyncDevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {}

  /**
   * Get total count of devices for progress tracking
   */
  async getTotalCount(): Promise<number> {
    return this.deviceRepository.count();
  }

  /**
   * Get min and max device_id for range-based parallelization
   */
  async getIdRange(): Promise<{ minId: number; maxId: number }> {
    const result = await this.deviceRepository
      .createQueryBuilder('device')
      .select('MIN(device.device_id)', 'minId')
      .addSelect('MAX(device.device_id)', 'maxId')
      .getRawOne();

    return {
      minId: result?.minId ?? 0,
      maxId: result?.maxId ?? 0,
    };
  }

  /**
   * Fetch a batch of devices using cursor-based pagination.
   * Much faster than OFFSET for large datasets (O(1) vs O(n)).
   *
   * Only loads relations needed for ES indexing:
   * - categories: for category_names
   * - informationalProperties: only image-related for thumbnail
   */
  async fetchBatch(
    lastId: number,
    batchSize: number,
  ): Promise<{ devices: Device[]; nextLastId: number }> {
    const devices = await this.deviceRepository
      .createQueryBuilder('device')
      .leftJoinAndSelect('device.categories', 'category')
      .leftJoinAndSelect(
        'device.informationalProperties',
        'info',
        "info.property_name IN ('FullImage', 'HighPic', 'image', 'Full Image', 'Image_ThumbPic', 'Image_HighPic', 'Image_LowPic')",
      )
      .where('device.device_id > :lastId', { lastId })
      .orderBy('device.device_id', 'ASC')
      .take(batchSize)
      .getMany();

    const nextLastId =
      devices.length > 0 ? devices[devices.length - 1].device_id : lastId;

    return { devices, nextLastId };
  }

  /**
   * Fetch devices within a specific ID range (for parallel workers)
   */
  async fetchBatchInRange(
    startId: number,
    endId: number,
    lastId: number,
    batchSize: number,
  ): Promise<{ devices: Device[]; nextLastId: number }> {
    const devices = await this.deviceRepository
      .createQueryBuilder('device')
      .leftJoinAndSelect('device.categories', 'category')
      .leftJoinAndSelect(
        'device.informationalProperties',
        'info',
        "info.property_name IN ('FullImage', 'HighPic', 'image', 'Full Image', 'Image_ThumbPic', 'Image_HighPic', 'Image_LowPic')",
      )
      .where('device.device_id > :lastId', { lastId })
      .andWhere('device.device_id <= :endId', { endId })
      .orderBy('device.device_id', 'ASC')
      .take(batchSize)
      .getMany();

    const nextLastId =
      devices.length > 0 ? devices[devices.length - 1].device_id : lastId;

    return { devices, nextLastId };
  }
}
