import { Command } from 'nestjs-command';
import { Injectable, Inject } from '@nestjs/common';
import { IRepairersService } from '../interfaces/repairers-service.interface';
import { RepairerSearchService } from '../../search/repairer-search.service';

@Injectable()
export class SyncRepairersCommand {
  constructor(
    @Inject('IRepairersService')
    private readonly repairersService: IRepairersService,
    private readonly repairerSearchService: RepairerSearchService,
  ) {}

  @Command({
    command: 'search:sync-repairers',
    describe: 'Sync all repairers to Elasticsearch',
  })
  async sync() {
    console.log('Starting repairers sync to Elasticsearch...');
    const repairers = await this.repairersService.findAll();
    console.log(`Found ${repairers.length} repairers to sync.`);

    let count = 0;
    for (const repairer of repairers) {
      await this.repairerSearchService.indexRepairer(repairer);
      count++;
      if (count % 10 === 0) {
        console.log(`Synced ${count}/${repairers.length} repairers...`);
      }
    }

    console.log('Repairers sync completed!');
  }
}
