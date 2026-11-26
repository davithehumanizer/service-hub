/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Body, Controller, Inject } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { IRepairersService } from './interfaces/repairers-service.interface';
import { RepairerImporterService } from './services/repairerImporter.service';
import { RepairerReportsService } from './services/repairer-reports.service';
import { RepairerProposalsService } from './services/repairer-proposals.service';
import { Editor, NO_EDITOR } from '../types/author';
import { RepairerSearchDto } from './types/repairer-search.dto';
import { RepairerReportStatus } from './constants/repairer-report-status';
import { MapBounds } from './services/repairers.service';

@Controller()
export class RepairersController {
  constructor(
    @Inject('IRepairersService')
    private readonly repairersService: IRepairersService,
    private readonly repairersImporterService: RepairerImporterService,
    private readonly repairerReportsService: RepairerReportsService,
    private readonly repairerProposalsService: RepairerProposalsService,
  ) {}

  @MessagePattern({ cmd: 'get_repairers' })
  async getAllRepairers() {
    try {
      return await this.repairersService.findAll();
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get repairers');
    }
  }

  @MessagePattern({ cmd: 'get_repairers_paginated' })
  async getRepairersPaginated(data: {
    page?: number;
    limit?: number;
    country?: string;
    device_type?: string;
    partner_type?: string | string[];
    search?: string;
    latitude?: number;
    longitude?: number;
    bounds?: MapBounds;
  }) {
    try {
      const {
        page,
        limit,
        country,
        device_type,
        partner_type,
        search,
        latitude,
        longitude,
        bounds,
      } = data;
      return await this.repairersService.findPaginated(page, limit, {
        country,
        device_type,
        partner_type,
        search,
        latitude,
        longitude,
        bounds,
      });
    } catch (error) {
      throw new RpcException(
        error.message || 'Failed to get paginated repairers',
      );
    }
  }

  @MessagePattern({ cmd: 'create_repairer' })
  async createRepairer(data: any) {
    try {
      return await this.repairersService.create(data);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to create repairer');
    }
  }

  @MessagePattern({ cmd: 'get_repairer' })
  async getRepairer(@Body() body: { id: string; viewer?: Editor }) {
    const { id, viewer } = body;
    try {
      return await this.repairersService.findOne(id, viewer ?? NO_EDITOR);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get repairer');
    }
  }

  @MessagePattern({ cmd: 'update_repairer' })
  async updateRepairer(data: any) {
    // The gateway sends { id, ...changes }.
    const { id, ...changes } = data;
    try {
      return await this.repairersService.update(id, changes);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to update repairer');
    }
  }

  @MessagePattern({ cmd: 'delete_repairer' })
  async deleteRepairer(@Body() body: { id: string }) {
    try {
      return await this.repairersService.delete(body.id);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to delete repairer');
    }
  }

  /** Previews (`dryRun`) or carries out the repairers' part of the purge. */
  @MessagePattern({ cmd: 'purge_demo_repairers' })
  async purgeDemoRepairers(@Body() body: { dryRun: boolean }) {
    try {
      return await this.repairersService.purgeDemo(body?.dryRun !== false);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to purge demo repairers');
    }
  }

  @MessagePattern({ cmd: 'demo_repairer_stats_of_contributor' })
  async demoRepairerStatsOfContributor(@Body() body: { contributorId: number }) {
    try {
      return await this.repairersService.demoStatsOf(body.contributorId);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to count demo repairers');
    }
  }

  @MessagePattern({ cmd: 'propose_repairer' })
  async proposeRepairer(
    @Body() body: { changes: Record<string, any>; editor: Editor },
  ) {
    try {
      return await this.repairerProposalsService.propose(
        body.changes,
        body.editor,
      );
    } catch (error) {
      throw new RpcException(error.message || 'Failed to propose repairer');
    }
  }

  @MessagePattern({ cmd: 'change_repairer_proposal' })
  async changeRepairerProposal(
    @Body() body: { id: string; changes: Record<string, any>; editor: Editor },
  ) {
    try {
      return await this.repairerProposalsService.change(
        body.id,
        body.changes,
        body.editor,
      );
    } catch (error) {
      throw new RpcException(error.message || 'Failed to change repairer');
    }
  }

  @MessagePattern({ cmd: 'withdraw_repairer_proposal' })
  async withdrawRepairerProposal(@Body() body: { id: string; editor: Editor }) {
    try {
      return await this.repairerProposalsService.withdraw(body.id, body.editor);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to withdraw repairer');
    }
  }

  @MessagePattern({ cmd: 'get_my_repairers' })
  async getMyRepairers(@Body() body: { editor: Editor }) {
    try {
      return await this.repairerProposalsService.mine(body.editor);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get your repairers');
    }
  }

  @MessagePattern({ cmd: 'get_pending_repairer_proposals' })
  async getPendingRepairerProposals() {
    try {
      return await this.repairerProposalsService.pending();
    } catch (error) {
      throw new RpcException(
        error.message || 'Failed to get pending repairer proposals',
      );
    }
  }

  @MessagePattern({ cmd: 'count_pending_repairer_proposals' })
  async countPendingRepairerProposals() {
    try {
      return { count: await this.repairerProposalsService.pendingCount() };
    } catch (error) {
      throw new RpcException(error.message || 'Failed to count proposals');
    }
  }

  @MessagePattern({ cmd: 'get_repairers_of_author' })
  async getRepairersOfAuthor(@Body() body: { authorId: number }) {
    try {
      return await this.repairerProposalsService.ofAuthor(body.authorId);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get the repairers');
    }
  }

  @MessagePattern({ cmd: 'review_repairer_proposal' })
  async reviewRepairerProposal(
    @Body()
    body: {
      id: string;
      decision: 'publish' | 'reject';
      note?: string | null;
      editor: Editor;
      version: string;
    },
  ) {
    try {
      return await this.repairerProposalsService.reviewProposal(
        body.id,
        body.decision,
        body.note ?? null,
        body.editor,
        body.version,
      );
    } catch (error) {
      throw new RpcException(error.message || 'Failed to review proposal');
    }
  }

  @MessagePattern({ cmd: 'review_repairer_revision' })
  async reviewRepairerRevision(
    @Body()
    body: {
      id: string;
      decision: 'apply' | 'reject';
      note?: string | null;
      editor: Editor;
    },
  ) {
    try {
      return await this.repairerProposalsService.reviewRevision(
        body.id,
        body.decision,
        body.note ?? null,
        body.editor,
      );
    } catch (error) {
      throw new RpcException(error.message || 'Failed to review change');
    }
  }

  @MessagePattern({ cmd: 'import_repairers' })
  async importRepairers() {
    try {
      await this.repairersImporterService.importCsv();
      return true;
    } catch (error) {
      throw new RpcException(error.message || 'Failed to import repairers');
    }
  }

  @MessagePattern({ cmd: 'get_repairer_markers' })
  async getRepairerMarkers(data: {
    bounds: MapBounds;
    country?: string;
    device_type?: string;
    partner_type?: string | string[];
    search?: string;
    limit?: number;
  }) {
    try {
      const { bounds, country, device_type, partner_type, search, limit } =
        data;
      return await this.repairersService.findMarkers(
        bounds,
        { country, device_type, partner_type, search },
        limit,
      );
    } catch (error) {
      throw new RpcException(
        error.message || 'Failed to get repairer markers',
      );
    }
  }

  @MessagePattern({ cmd: 'get_repairers_filters' })
  async getRepairersFilters() {
    try {
      return await this.repairersService.getFilters();
    } catch (error) {
      throw new RpcException(
        error.message || 'Failed to get repairers filters',
      );
    }
  }

  @MessagePattern({ cmd: 'search_repairers' })
  async searchRepairers(
    @Body() body: { body: { searchDto: RepairerSearchDto } },
  ) {
    console.log(body);
    const { searchDto } = body.body;
    try {
      console.log('searchDTO : ', searchDto);
      return await this.repairersService.searchRepairers(searchDto);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to search repairers');
    }
  }

  @MessagePattern({ cmd: 'find_nearest_repairer' })
  async findNearestRepairer(
    @Body() body: { latitude: number; longitude: number },
  ) {
    const { latitude, longitude } = body;
    try {
      return await this.repairersService.findNearestRepairer(
        latitude,
        longitude,
      );
    } catch (error) {
      throw new RpcException(
        error.message || 'Failed to find nearest repairer',
      );
    }
  }

  @MessagePattern({ cmd: 'report_repairer' })
  async reportRepairer(
    @Body() body: { repairer_id: string; reason?: string },
  ) {
    try {
      return await this.repairerReportsService.create(
        body.repairer_id,
        body.reason,
      );
    } catch (error) {
      throw new RpcException(error.message || 'Failed to report repairer');
    }
  }

  @MessagePattern({ cmd: 'get_repairer_reports' })
  async getRepairerReports(@Body() body: { status?: string }) {
    try {
      return await this.repairerReportsService.findAll(body?.status);
    } catch (error) {
      throw new RpcException(
        error.message || 'Failed to get repairer reports',
      );
    }
  }

  @MessagePattern({ cmd: 'update_repairer_report_status' })
  async updateRepairerReportStatus(
    @Body()
    body: {
      id: string;
      status: RepairerReportStatus;
      reviewedBy?: string;
    },
  ) {
    try {
      return await this.repairerReportsService.updateStatus(
        body.id,
        body.status,
        body.reviewedBy,
      );
    } catch (error) {
      throw new RpcException(
        error.message || 'Failed to update repairer report status',
      );
    }
  }
}
