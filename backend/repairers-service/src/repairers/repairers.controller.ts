/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Body, Controller, Inject } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { IRepairersService } from './interfaces/repairers-service.interface';
import { RepairerImporterService } from './services/repairerImporter.service';
import { RepairerReportsService } from './services/repairer-reports.service';
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
  async getRepairer(@Body() body: { id: string }) {
    const { id } = body;
    try {
      return await this.repairersService.findOne(id);
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
  async deleteRepairer(id: string) {
    try {
      return await this.repairersService.delete(id);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to delete repairer');
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
