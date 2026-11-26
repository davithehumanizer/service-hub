import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { DemoDataService } from './demo-data.service';

@Controller()
export class DemoDataController {
  constructor(private readonly demoData: DemoDataService) {}

  /** Previews (`dryRun`) or carries out the catalogue's part of the purge. */
  @MessagePattern({ cmd: 'purge_demo_catalogue' })
  async purgeDemoCatalogue(
    @Payload()
    data: { contributorIds: number[]; contributorEmails?: string[]; dryRun: boolean },
  ) {
    try {
      return await this.demoData.purge(
        data.contributorIds ?? [],
        data.contributorEmails ?? [],
        data.dryRun !== false,
      );
    } catch (error) {
      throw new RpcException(error.message || 'Failed to purge demo data');
    }
  }

  /** What one contributor entered, and what names it. */
  @MessagePattern({ cmd: 'demo_stats_of_contributor' })
  async demoStatsOfContributor(
    @Payload() data: { contributorId: number; email: string },
  ) {
    try {
      return await this.demoData.statsOf(data.contributorId, data.email ?? '');
    } catch (error) {
      throw new RpcException(error.message || 'Failed to count demo data');
    }
  }
}
