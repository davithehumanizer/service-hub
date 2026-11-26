import { Module } from '@nestjs/common';
import { RepairersController } from './repairers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repairer } from './repairer.entity';
import { RepairersServiceProvider } from './providers/repairers-service.provider';
import { RepairerImporterService } from './services/repairerImporter.service';
import { RepairerReportsService } from './services/repairer-reports.service';
import { RepairerDevice } from './repairer-device.entity';
import { RepairerReport } from './repairer-report.entity';
import { RepairerRevision } from './repairer-revision.entity';
import { RepairerProposalsService } from './services/repairer-proposals.service';
import { CommandModule } from 'nestjs-command';
import { SyncRepairersCommand } from './commands/sync-repairers.command';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Repairer,
      RepairerDevice,
      RepairerReport,
      RepairerRevision,
    ]),
    CommandModule,
    SearchModule,
  ],
  providers: [
    RepairersServiceProvider,
    RepairerImporterService,
    RepairerReportsService,
    RepairerProposalsService,
    SyncRepairersCommand,
  ],
  controllers: [RepairersController],
  exports: [RepairersServiceProvider],
})
export class RepairersModule {}
