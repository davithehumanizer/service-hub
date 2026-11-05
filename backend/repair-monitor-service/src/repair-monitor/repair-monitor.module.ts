import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { RepairMonitorController } from "./repair-monitor.controller";
import { RepairMonitorService } from "./repair-monitor.service";
import { RepairRecord } from "./entities/repair-record.entity";
import { RepairCategory } from "./entities/repair-category.entity";
import { RepairCategoryTranslation } from "./entities/repair-category-translation.entity";
import { RepairCategoryDeviceMapping } from "./entities/repair-category-device-mapping.entity";
import { RepairJourney } from "./entities/repair-journey.entity";
import { RepairJourneyService } from "./repair-journey.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      RepairRecord,
      RepairCategory,
      RepairCategoryTranslation,
      RepairCategoryDeviceMapping,
      RepairJourney,
    ]),
  ],
  controllers: [RepairMonitorController],
  providers: [RepairMonitorService, RepairJourneyService],
})
export class RepairMonitorModule {}
