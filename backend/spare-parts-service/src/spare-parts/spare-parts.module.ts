import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { SparePartsAdapterService } from "./spare-parts.service";
import { SparePartsAdapterController } from "./spare-parts.controller";
import { PartsFinderApiService } from "./parts-finder-api.service";

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [SparePartsAdapterController],
  providers: [SparePartsAdapterService, PartsFinderApiService],
})
export class SparePartsAdapterModule {}
