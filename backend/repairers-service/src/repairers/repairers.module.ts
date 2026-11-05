import { Module } from '@nestjs/common';
import { RepairersController } from './repairers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repairer } from './repairer.entity';
import { RepairersServiceProvider } from './providers/repairers-service.provider';
import { RepairerImporterService } from './services/repairerImporter.service';
import { RepairerReportsService } from './services/repairer-reports.service';
import { RepairerDevice } from './repairer-device.entity';
import { RepairerReport } from './repairer-report.entity';
import { CommandModule } from 'nestjs-command';
import { SyncRepairersCommand } from './commands/sync-repairers.command';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Repairer, RepairerDevice, RepairerReport]),
    CommandModule,
    SearchModule,
  ],
  providers: [
    RepairersServiceProvider,
    RepairerImporterService,
    RepairerReportsService,
    SyncRepairersCommand,
  ],
  controllers: [RepairersController],
  exports: [RepairersServiceProvider],
})
export class RepairersModule {}
