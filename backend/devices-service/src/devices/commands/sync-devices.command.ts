import { Command, Option } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { SyncDevicesService } from '../services/sync-devices.service';
import { DeviceSearchService } from '../../search/device-search.service';

@Injectable()
export class SyncDevicesCommand {
  constructor(
    private readonly syncDevicesService: SyncDevicesService,
    private readonly deviceSearchService: DeviceSearchService,
  ) {}

  @Command({
    command: 'search:sync-devices',
    describe: 'Sync all devices to Elasticsearch using optimized bulk indexing',
  })
  async sync(
    @Option({
      name: 'batch-size',
      describe: 'Number of devices per batch',
      type: 'number',
      default: 1000,
    })
    batchSize: number,
    @Option({
      name: 'workers',
      describe: 'Number of parallel workers (segments)',
      type: 'number',
      default: 4,
    })
    workerCount: number,
  ) {
    console.log('Starting devices sync to Elasticsearch...');
    console.log(
      `Configuration: batchSize=${batchSize}, workers=${workerCount}`,
    );

    const startTime = Date.now();
    const totalCount = await this.syncDevicesService.getTotalCount();
    console.log(`Found ${totalCount} devices to sync.`);

    if (totalCount === 0) {
      console.log('No devices to sync.');
      return;
    }

    if (workerCount > 1) {
      await this.runParallelSync(workerCount, batchSize, totalCount);
    } else {
      await this.runSequentialSync(batchSize, totalCount);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Devices sync completed in ${duration}s!`);
  }

  /**
   * Sequential sync using cursor-based pagination and bulk indexing
   */
  private async runSequentialSync(
    batchSize: number,
    totalCount: number,
  ): Promise<void> {
    let lastId = 0;
    let totalSynced = 0;
    let totalErrors = 0;
    let batchNumber = 0;

    while (true) {
      batchNumber++;
      const batchStart = Date.now();

      const { devices, nextLastId } = await this.syncDevicesService.fetchBatch(
        lastId,
        batchSize,
      );

      if (devices.length === 0) {
        break;
      }

      const { indexed, errors } =
        await this.deviceSearchService.bulkIndexDevices(devices);
      totalSynced += indexed;
      totalErrors += errors;

      const batchDuration = ((Date.now() - batchStart) / 1000).toFixed(2);
      const progress = ((totalSynced / totalCount) * 100).toFixed(1);
      console.log(
        `Batch ${batchNumber}: ${indexed} indexed, ${errors} errors | ` +
          `Progress: ${totalSynced}/${totalCount} (${progress}%) | ` +
          `Duration: ${batchDuration}s`,
      );

      lastId = nextLastId;
    }

    console.log(
      `Sequential sync complete: ${totalSynced} indexed, ${totalErrors} errors.`,
    );
  }

  /**
   * Parallel sync by dividing ID range into segments
   */
  private async runParallelSync(
    workerCount: number,
    batchSize: number,
    totalCount: number,
  ): Promise<void> {
    const { minId, maxId } = await this.syncDevicesService.getIdRange();
    const rangeSize = Math.ceil((maxId - minId + 1) / workerCount);

    console.log(
      `ID range: ${minId} - ${maxId}, dividing into ${workerCount} segments`,
    );

    // Create worker promises for each segment
    const workers: Promise<{ indexed: number; errors: number }>[] = [];

    for (let i = 0; i < workerCount; i++) {
      const startId = minId + i * rangeSize - 1; // -1 because we use > lastId
      const endId = Math.min(minId + (i + 1) * rangeSize - 1, maxId);

      console.log(
        `Worker ${i + 1}: Processing ID range ${startId + 1} - ${endId}`,
      );

      workers.push(this.processSegment(i + 1, startId, endId, batchSize));
    }

    // Run all workers in parallel
    const results = await Promise.all(workers);

    const totalIndexed = results.reduce((sum, r) => sum + r.indexed, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

    console.log(
      `Parallel sync complete: ${totalIndexed} indexed, ${totalErrors} errors.`,
    );
  }

  /**
   * Process a single segment of IDs
   */
  private async processSegment(
    workerId: number,
    startId: number,
    endId: number,
    batchSize: number,
  ): Promise<{ indexed: number; errors: number }> {
    let lastId = startId;
    let totalIndexed = 0;
    let totalErrors = 0;
    let batchNumber = 0;

    while (true) {
      batchNumber++;

      const { devices, nextLastId } =
        await this.syncDevicesService.fetchBatchInRange(
          startId,
          endId,
          lastId,
          batchSize,
        );

      if (devices.length === 0) {
        break;
      }

      const { indexed, errors } =
        await this.deviceSearchService.bulkIndexDevices(devices);
      totalIndexed += indexed;
      totalErrors += errors;

      console.log(
        `Worker ${workerId} batch ${batchNumber}: ${indexed} indexed, ${errors} errors`,
      );

      lastId = nextLastId;
    }

    console.log(
      `Worker ${workerId} complete: ${totalIndexed} indexed, ${totalErrors} errors`,
    );

    return { indexed: totalIndexed, errors: totalErrors };
  }
}
