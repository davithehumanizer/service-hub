import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiTool, ApiToolStatus } from "./entities/api-tool.entity";
import { SubmitApiToolDto } from "./dto/submit-api-tool.dto";

@Injectable()
export class ApiCatalogService {
  constructor(
    @InjectRepository(ApiTool)
    private readonly apiToolRepository: Repository<ApiTool>,
  ) {}

  async listApproved(): Promise<ApiTool[]> {
    return this.apiToolRepository.find({
      where: { status: ApiToolStatus.APPROVED },
      order: { isBuiltIn: "DESC", approvedAt: "DESC" },
    });
  }

  async listPending(): Promise<ApiTool[]> {
    return this.apiToolRepository.find({
      where: { status: ApiToolStatus.PENDING },
      order: { createdAt: "ASC" },
    });
  }

  async getById(id: string): Promise<ApiTool> {
    const tool = await this.apiToolRepository.findOne({ where: { id } });
    if (!tool) {
      throw new NotFoundException(`API Tool with id ${id} not found`);
    }
    return tool;
  }

  async submit(
    dto: SubmitApiToolDto,
    submitterUserId: string,
  ): Promise<ApiTool> {
    const tool = this.apiToolRepository.create({
      ...dto,
      submitterUserId,
      status: ApiToolStatus.PENDING,
    });
    return this.apiToolRepository.save(tool);
  }

  async approve(
    id: string,
    adminUserId: string,
    isCommunity: boolean = true,
  ): Promise<ApiTool> {
    const tool = await this.getById(id);
    tool.status = ApiToolStatus.APPROVED;
    tool.approvedBy = adminUserId;
    tool.approvedAt = new Date();
    tool.rejectionReason = null;
    tool.isCommunity = isCommunity;
    return this.apiToolRepository.save(tool);
  }

  async reject(
    id: string,
    adminUserId: string,
    reason?: string,
  ): Promise<ApiTool> {
    const tool = await this.getById(id);
    tool.status = ApiToolStatus.REJECTED;
    tool.approvedBy = adminUserId;
    tool.rejectionReason = reason ?? null;
    return this.apiToolRepository.save(tool);
  }
}
