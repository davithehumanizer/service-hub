import { Controller, Logger } from "@nestjs/common";
import { MessagePattern, Payload, RpcException } from "@nestjs/microservices";
import { RepairMonitorService } from "./repair-monitor.service";
import { CreateRepairRecordDto } from "./dto/create-repair-record.dto";
import { UpdateRepairRecordDto } from "./dto/update-repair-record.dto";
import { QueryRepairRecordsDto } from "./dto/query-repair-records.dto";
import { RepairJourneyService, FrozenImpact } from "./repair-journey.service";
import { CreateRepairJourneyDto } from "./dto/create-repair-journey.dto";
import { DeclareOutcomeDto } from "./dto/declare-outcome.dto";

@Controller()
export class RepairMonitorController {
  private readonly logger = new Logger(RepairMonitorController.name);

  constructor(
    private readonly repairMonitorService: RepairMonitorService,
    private readonly repairJourneyService: RepairJourneyService,
  ) {}

  @MessagePattern({ cmd: "create_repair_journey" })
  async createJourney(
    @Payload() data: { dto: CreateRepairJourneyDto; userId?: string },
  ) {
    try {
      return await this.repairJourneyService.create(data.dto, data.userId);
    } catch (error) {
      throw new RpcException(
        error.message || "Failed to create repair journey",
      );
    }
  }

  @MessagePattern({ cmd: "declare_journey_outcome" })
  async declareJourneyOutcome(
    @Payload()
    data: {
      journeyId: string;
      dto: DeclareOutcomeDto;
      userId?: string;
      // Computed by the gateway from the journey's category. A separate field
      // rather than part of `dto`, so it can never arrive from the browser.
      impact?: FrozenImpact | null;
    },
  ) {
    try {
      return await this.repairJourneyService.declareOutcome(
        data.journeyId,
        data.dto,
        data.userId,
        data.impact,
      );
    } catch (error) {
      throw new RpcException({
        message: error.message || "Failed to declare outcome",
        status: error.status,
      });
    }
  }

  @MessagePattern({ cmd: "list_repair_journeys" })
  async listJourneys(
    @Payload() data: { tokens: string[]; userId?: string },
  ) {
    try {
      return await this.repairJourneyService.list(data.tokens, data.userId);
    } catch (error) {
      throw new RpcException(error.message || "Failed to list journeys");
    }
  }

  @MessagePattern({ cmd: "link_journey_personal_device" })
  async linkJourneyPersonalDevice(
    @Payload()
    data: {
      journeyId: string;
      userId: string;
      device: { ownershipId: string; modelId: number; deviceId: number | null };
      adopt?: boolean;
    },
  ) {
    try {
      return await this.repairJourneyService.linkPersonalDevice(
        data.journeyId,
        data.userId,
        data.device,
        data.adopt === true,
      );
    } catch (error) {
      throw new RpcException({
        message: error.message || "Failed to link the journey",
        status: error.status,
      });
    }
  }

  @MessagePattern({ cmd: "get_journey_device" })
  async getJourneyDevice(
    @Payload() data: { journeyId: string; userId: string },
  ) {
    try {
      return await this.repairJourneyService.deviceOfJourney(
        data.journeyId,
        data.userId,
      );
    } catch (error) {
      throw new RpcException({
        message: error.message || "Failed to read the journey",
        status: error.status,
      });
    }
  }

  @MessagePattern({ cmd: "adopt_journey_model" })
  async adoptJourneyModel(
    @Payload() data: { journeyId: string; userId: string; modelId: number },
  ) {
    try {
      return await this.repairJourneyService.adoptModel(
        data.journeyId,
        data.userId,
        data.modelId,
      );
    } catch (error) {
      throw new RpcException({
        message: error.message || "Failed to give the journey its model",
        status: error.status,
      });
    }
  }

  @MessagePattern({ cmd: "claim_repair_journeys" })
  async claimJourneys(
    @Payload() data: { tokens: string[]; userId: string },
  ) {
    try {
      return await this.repairJourneyService.claim(data.tokens, data.userId);
    } catch (error) {
      throw new RpcException(error.message || "Failed to claim journeys");
    }
  }

  @MessagePattern({ cmd: "create_repair_record" })
  async create(
    @Payload() data: { dto: CreateRepairRecordDto; userId?: string },
  ) {
    try {
      return await this.repairMonitorService.create(data.dto, data.userId);
    } catch (error) {
      throw new RpcException(error.message || "Failed to create repair record");
    }
  }

  @MessagePattern({ cmd: "find_all_repair_records" })
  async findAll(@Payload() query: QueryRepairRecordsDto) {
    try {
      return await this.repairMonitorService.findAll(query || {});
    } catch (error) {
      throw new RpcException(error.message || "Failed to fetch repair records");
    }
  }

  @MessagePattern({ cmd: "find_one_repair_record" })
  async findOne(@Payload() data: { id: string }) {
    try {
      return await this.repairMonitorService.findOne(data.id);
    } catch (error) {
      throw new RpcException(error.message || "Repair record not found");
    }
  }

  @MessagePattern({ cmd: "update_repair_record" })
  async update(@Payload() data: { id: string; dto: UpdateRepairRecordDto }) {
    try {
      return await this.repairMonitorService.update(data.id, data.dto);
    } catch (error) {
      throw new RpcException(error.message || "Failed to update repair record");
    }
  }

  @MessagePattern({ cmd: "delete_repair_record" })
  async remove(@Payload() data: { id: string }) {
    try {
      await this.repairMonitorService.remove(data.id);
      return { success: true };
    } catch (error) {
      throw new RpcException(error.message || "Failed to delete repair record");
    }
  }

  @MessagePattern({ cmd: "import_repair_records" })
  async importCsv(@Payload() data: { rows: any[] }) {
    try {
      return await this.repairMonitorService.importFromCsv(data.rows);
    } catch (error) {
      throw new RpcException(
        error.message || "Failed to import repair records",
      );
    }
  }

  @MessagePattern({ cmd: "get_repair_stats_by_category" })
  async statsByCategory(@Payload() filters: any) {
    try {
      return await this.repairMonitorService.getStatsByCategory(filters || {});
    } catch (error) {
      throw new RpcException(
        error.message || "Failed to get stats by category",
      );
    }
  }

  @MessagePattern({ cmd: "get_repair_stats_by_brand" })
  async statsByBrand(@Payload() data: { filters?: any; limit?: number }) {
    try {
      return await this.repairMonitorService.getStatsByBrand(
        data.filters || {},
        data.limit,
      );
    } catch (error) {
      throw new RpcException(error.message || "Failed to get stats by brand");
    }
  }

  @MessagePattern({ cmd: "get_repair_stats_by_outcome" })
  async statsByOutcome(@Payload() filters: any) {
    try {
      return await this.repairMonitorService.getStatsByOutcome(filters || {});
    } catch (error) {
      throw new RpcException(error.message || "Failed to get stats by outcome");
    }
  }

  @MessagePattern({ cmd: "get_repair_stats_failure_reasons" })
  async statsFailureReasons(@Payload() filters: any) {
    try {
      return await this.repairMonitorService.getStatsFailureReasons(
        filters || {},
      );
    } catch (error) {
      throw new RpcException(
        error.message || "Failed to get failure reason stats",
      );
    }
  }

  @MessagePattern({ cmd: "get_repair_stats_over_time" })
  async statsOverTime(@Payload() filters: any) {
    try {
      return await this.repairMonitorService.getStatsOverTime(filters || {});
    } catch (error) {
      throw new RpcException(error.message || "Failed to get stats over time");
    }
  }

  @MessagePattern({ cmd: "get_platform_summary" })
  async getPlatformSummary() {
    try {
      return await this.repairMonitorService.getPlatformSummary();
    } catch (error) {
      throw new RpcException(error.message || "Failed to get platform summary");
    }
  }

  @MessagePattern({ cmd: "get_repair_categories" })
  async getRepairCategories(@Payload() data: { locale?: string } = {}) {
    try {
      return await this.repairMonitorService.findAllRepairCategories(
        data?.locale,
      );
    } catch (error) {
      throw new RpcException(
        error.message || "Failed to get repair categories",
      );
    }
  }

  @MessagePattern({ cmd: "get_repair_category_by_device_category" })
  async getRepairCategoryByDeviceCategory(
    @Payload() data: { deviceCategoryId: number },
  ) {
    try {
      return await this.repairMonitorService.findRepairCategoryByDeviceCategoryId(
        data.deviceCategoryId,
      );
    } catch (error) {
      throw new RpcException(
        error.message || "Failed to get repair category by device category",
      );
    }
  }
}
