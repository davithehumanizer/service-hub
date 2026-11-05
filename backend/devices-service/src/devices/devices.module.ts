import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DeviceTechnicalProperty } from '../entity/device-technical-property.entity';
import { Device } from '../entity/device.entity';
import { DevicePhoto } from '../entity/device-photo.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesServiceProvider } from './providers/devices-service.provider';
import { DeviceCategory } from '../entity/device-category.entity';
import { DeviceCategoryServiceProvider } from './providers/device-category-service.provider';
import { DeviceCategoryController } from './controllers/device-category.controller';
import { DeviceCategoriesMicroController } from './device-categories.micro.controller';
import { DeviceInformationalProperty } from 'src/entity/device-informational-property.entity';
import { CommandModule } from 'nestjs-command';
import { ImportIcecatCommand } from './commands/import-icecat.command';
import { SyncDevicesCommand } from './commands/sync-devices.command';
import { AssignModelsCommand } from './commands/assign-models.command';
import { SyncModelsCommand } from './commands/sync-models.command';
import { ModelAssignmentService } from '../device-models/model-assignment.service';
import { ModelIndexService } from '../device-models/model-index.service';
import { VariantLabelService } from '../device-models/variant-label.service';
import { ModelsService } from '../device-models/models.service';
import { DeviceModelsController } from '../device-models/device-models.controller';
import { SyncDevicesService } from './services/sync-devices.service';
import { SearchModule } from '../search/search.module';
import { DemoDataService } from '../demo-data/demo-data.service';
import { DemoDataController } from '../demo-data/demo-data.controller';
import { ContributionsService } from '../contributions/contributions.service';
import { ContributionsController } from '../contributions/contributions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Device,
      DeviceTechnicalProperty,
      DeviceInformationalProperty,
      DeviceCategory,
      DevicePhoto,
    ]),
    CommandModule,
    SearchModule,
  ],

  providers: [
    DevicesServiceProvider,
    DeviceCategoryServiceProvider,
    SyncDevicesService,
    ModelAssignmentService,
    ModelIndexService,
    VariantLabelService,
    ModelsService,
    DemoDataService,
    ContributionsService,
    ImportIcecatCommand,
    SyncDevicesCommand,
    AssignModelsCommand,
    SyncModelsCommand,
  ],

  controllers: [
    DevicesController,
    DeviceCategoryController,
    DeviceCategoriesMicroController,
    DeviceModelsController,
    DemoDataController,
    ContributionsController,
  ],

  exports: [DevicesServiceProvider],
})
export class DevicesModule {}
