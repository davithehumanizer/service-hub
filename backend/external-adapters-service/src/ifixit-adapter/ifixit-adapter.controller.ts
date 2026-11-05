import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { IfixitAdapterService } from "./ifixit-adapter.service";

@Controller()
export class IfixitAdapterController {
  constructor(private readonly ifixitAdapterService: IfixitAdapterService) {}

  @MessagePattern({ cmd: "get-all-devices-ifixit" })
  getAllDevices(@Payload() data: { page: number; limit: number }) {
    const { page, limit } = data;
    return this.ifixitAdapterService.getAllDevices(page, limit);
  }

  @MessagePattern({ cmd: "get-device-by-id-ifixit" })
  getDeviceById(@Payload() data: { id: string }) {
    const { id } = data;
    return this.ifixitAdapterService.getDeviceById(id);
  }

  @MessagePattern({ cmd: "get-device-parts-ifixit" })
  getDeviceParts(@Payload() data: { id: string }) {
    const { id } = data;
    return this.ifixitAdapterService.getDeviceParts(id);
  }

  @MessagePattern({ cmd: "get-device-guide-ifixit" })
  getDeviceGuide(@Payload() data: { id: string; guideid: string }) {
    const { id, guideid } = data;
    return this.ifixitAdapterService.getDeviceGuide(id, guideid);
  }

  @MessagePattern({ cmd: "search-device-ifixit" })
  searchDevice(
    @Payload()
    data: {
      query: string;
      type: string;
      subject: string;
      difficulty: string;
      brand?: string;
      category?: string;
      categoryWikiId?: string;
      lang?: string;
    },
  ) {
    const {
      query,
      type,
      subject,
      difficulty,
      brand,
      category,
      categoryWikiId,
      lang,
    } = data;
    return this.ifixitAdapterService.searchDevice(
      query,
      type,
      subject,
      difficulty,
      brand,
      category,
      categoryWikiId,
      lang,
    );
  }

  @MessagePattern({ cmd: "suggest-device-ifixit" })
  suggestDevice(@Payload() data: { query: string }) {
    const { query } = data;
    return this.ifixitAdapterService.suggestDevice(query);
  }
}
