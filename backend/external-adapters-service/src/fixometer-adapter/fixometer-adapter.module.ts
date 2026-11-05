import { Module } from "@nestjs/common";
import { FixometerAdapterService } from "./fixometer-adapter.service";
import { FixometerAdapterController } from "./fixometer-adapter.controller";

@Module({
  controllers: [FixometerAdapterController],
  providers: [FixometerAdapterService],
  exports: [FixometerAdapterService],
})
export class FixometerAdapterModule {}
