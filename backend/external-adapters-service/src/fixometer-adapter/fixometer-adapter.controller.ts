import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { FixometerAdapterService } from "./fixometer-adapter.service";

@Controller()
export class FixometerAdapterController {
  constructor(
    private readonly fixometerAdapterService: FixometerAdapterService,
  ) {}

  // `weight` and `isElectrical` are gone: the reference data gives CO2e per
  // category, so neither the device's mass nor a lookup of its electrical flag
  // is needed any more.
  @MessagePattern({ cmd: "fetch-impact-metrics" })
  fetchImpactMetrics(@Payload() data: { deviceType: string }): any {
    return this.fixometerAdapterService.fetchImpactMetrics(data.deviceType);
  }
}
