import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { ApiCatalogService } from "./api-catalog.service";
import { SubmitApiToolDto } from "./dto/submit-api-tool.dto";

@Controller()
export class ApiCatalogController {
  constructor(private readonly apiCatalogService: ApiCatalogService) {}

  @MessagePattern({ cmd: "list_approved_tools" })
  async listApproved() {
    return this.apiCatalogService.listApproved();
  }

  @MessagePattern({ cmd: "list_pending_tools" })
  async listPending() {
    return this.apiCatalogService.listPending();
  }

  @MessagePattern({ cmd: "get_tool_by_id" })
  async getById(@Payload() data: { id: string }) {
    return this.apiCatalogService.getById(data.id);
  }

  @MessagePattern({ cmd: "submit_tool" })
  async submit(
    @Payload() data: { dto: SubmitApiToolDto; submitterUserId: string },
  ) {
    return this.apiCatalogService.submit(data.dto, data.submitterUserId);
  }

  @MessagePattern({ cmd: "approve_tool" })
  async approve(
    @Payload() data: { id: string; adminUserId: string; isCommunity?: boolean },
  ) {
    return this.apiCatalogService.approve(
      data.id,
      data.adminUserId,
      data.isCommunity,
    );
  }

  @MessagePattern({ cmd: "reject_tool" })
  async reject(
    @Payload() data: { id: string; adminUserId: string; reason?: string },
  ) {
    return this.apiCatalogService.reject(
      data.id,
      data.adminUserId,
      data.reason,
    );
  }
}
