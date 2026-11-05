import { Test, TestingModule } from '@nestjs/testing';
import { SyncRepairersCommand } from '../sync-repairers.command';
import { RepairerSearchService } from '../../../search/repairer-search.service';

describe('SyncRepairersCommand', () => {
  let command: SyncRepairersCommand;
  let repairersService: any;
  let repairerSearchService: any;

  beforeEach(async () => {
    repairersService = {
      findAll: jest.fn().mockResolvedValue([
        { repairer_id: '1', name: 'Repairer 1' },
        { repairer_id: '2', name: 'Repairer 2' },
      ]),
    };

    repairerSearchService = {
      indexRepairer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncRepairersCommand,
        { provide: 'IRepairersService', useValue: repairersService },
        { provide: RepairerSearchService, useValue: repairerSearchService },
      ],
    }).compile();

    command = module.get<SyncRepairersCommand>(SyncRepairersCommand);
  });

  it('should be defined', () => {
    expect(command).toBeDefined();
  });

  it('should sync all repairers', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await command.sync();

    expect(repairersService.findAll).toHaveBeenCalled();
    expect(repairerSearchService.indexRepairer).toHaveBeenCalledTimes(2);
    expect(repairerSearchService.indexRepairer).toHaveBeenCalledWith({
      repairer_id: '1',
      name: 'Repairer 1',
    });
    expect(repairerSearchService.indexRepairer).toHaveBeenCalledWith({
      repairer_id: '2',
      name: 'Repairer 2',
    });
    
    consoleSpy.mockRestore();
  });

  it('should log progress', async () => {
     // Create 11 items to trigger the % 10 log
    const repairers = Array.from({ length: 11 }, (_, i) => ({ repairer_id: `${i}`, name: `R${i}` }));
    repairersService.findAll.mockResolvedValue(repairers);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await command.sync();

    expect(consoleSpy).toHaveBeenCalledWith('Starting repairers sync to Elasticsearch...');
    expect(consoleSpy).toHaveBeenCalledWith(`Found 11 repairers to sync.`);
    expect(consoleSpy).toHaveBeenCalledWith(`Synced 10/11 repairers...`);
    expect(consoleSpy).toHaveBeenCalledWith('Repairers sync completed!');

    consoleSpy.mockRestore();
  });
});
