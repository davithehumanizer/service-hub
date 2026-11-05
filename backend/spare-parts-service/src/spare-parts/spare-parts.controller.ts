import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { SparePartsAdapterService } from "./spare-parts.service";

@Controller()
export class SparePartsAdapterController {
  constructor(private readonly sparePartsService: SparePartsAdapterService) {}

  @MessagePattern({ cmd: "spare-parts-search" })
  search(
    @Payload()
    data: {
      q?: string;
      brand?: string;
      category?: string;
      offset?: number;
      limit?: number;
    },
  ) {
    return this.sparePartsService.search(data);
  }

  @MessagePattern({ cmd: "spare-parts-get-by-id" })
  getById(@Payload() data: { id: string }) {
    return this.sparePartsService.getById(data);
  }

  @MessagePattern({ cmd: "spare-parts-list" })
  list(@Payload() data: { offset?: number; limit?: number }) {
    return this.sparePartsService.list(data);
  }
  @MessagePattern({ cmd: "spare-parts-search-by-device" })
  searchByDevice(
    @Payload()
    data: {
      brand: string;
      model: string;
      offset?: number;
      limit?: number;
    },
  ) {
    return this.sparePartsService.searchByDevice(data);
  }
  @MessagePattern({ cmd: "spare-parts-multi-search" })
  multiSearch(@Payload() data: { q: string }) {
    return this.sparePartsService.multiSearch(data);
  }
}
