/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import {
  Controller,
  Inject,
  Get,
  UseGuards,
  HttpException,
  HttpStatus,
  Post,
  Body,
  Param,
  Query,
  Req,
  Logger,
  Version,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { FlexibleAuthGuard } from 'src/auth/flexible-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { Permissions } from 'src/auth/permission.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreateRepairerDto } from './dto/create-repairer.dto';
import { RepairerDto } from './dto/repairer.dto';
import { RepairerDeviceDto } from './dto/repairer-device.dto';
import { UpdateRepairerDto } from './dto/update-repairer.dto';
import { NearestRepairerDto } from './dto/nearest-repairer.dto';
import { MapBoundsQueryDto } from './dto/map-bounds-query.dto';
import { RepairerFilterDto } from './dto/repairer-filter.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { PaginatedRepairersResponseDto } from './dto/paginated-repairers-response.dto';
import { ReportRepairerDto } from './dto/report-repairer.dto';
import { UpdateRepairerReportStatusDto } from './dto/update-repairer-report-status.dto';

@ApiTags('Repairers')
@ApiExtraModels(
  CreateRepairerDto,
  RepairerDto,
  RepairerDeviceDto,
  UpdateRepairerDto,
  NearestRepairerDto,
  RepairerFilterDto,
  PaginationQueryDto,
  PaginatedRepairersResponseDto,
  ReportRepairerDto,
  UpdateRepairerReportStatusDto,
)
@Controller('repairers')
export class RepairersController {
  private readonly logger = new Logger(RepairersController.name);
  constructor(
    @Inject('REPAIRERS_SERVICE') private readonly repairersService: ClientProxy,
  ) {}

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.get_all')
  @Version('1')
  @Get()
  @ApiOperation({ summary: 'Get all repairers' })
  @ApiResponse({
    status: 200,
    description: 'Returns all repairers.',
    schema: { type: 'array', items: { $ref: getSchemaPath(RepairerDto) } },
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getAllRepairers() {
    this.logger.log('getAllRepairers called');
    try {
      const result = await firstValueFrom(
        this.repairersService.send({ cmd: 'get_repairers' }, {}),
      );
      this.logger.log('getAllRepairers result', result);
      return result;
    } catch (error) {
      this.logger.error('getAllRepairers error', error.stack, error);
      throw new HttpException(
        error.message || 'Failed to get repairers',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.get_all')
  @Version('2')
  @Get()
  @ApiOperation({ summary: 'Get repairers with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated repairers.',
    schema: { $ref: getSchemaPath(PaginatedRepairersResponseDto) },
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getAllRepairersPaginated(@Query() query: PaginationQueryDto) {
    this.logger.log('getAllRepairersPaginated called', query);
    try {
      const { north, south, east, west, ...rest } = query;
      // All four edges or none: three of them describe no rectangle, and
      // applying a partial one would filter on an axis the caller never chose.
      const bounds =
        north != null && south != null && east != null && west != null
          ? { north, south, east, west }
          : undefined;

      const result = await firstValueFrom(
        this.repairersService.send(
          { cmd: 'get_repairers_paginated' },
          { ...rest, bounds },
        ),
      );
      this.logger.log('getAllRepairersPaginated result', result);
      return result;
    } catch (error) {
      this.logger.error('getAllRepairersPaginated error', error.stack, error);
      throw new HttpException(
        error.message || 'Failed to get paginated repairers',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.create')
  @Version('1')
  @Post()
  @ApiExtraModels(CreateRepairerDto, RepairerDto)
  @ApiOperation({ summary: 'Create a new repairer' })
  @ApiBody({ schema: { $ref: getSchemaPath(CreateRepairerDto) } })
  @ApiResponse({
    status: 201,
    description: 'Repairer created successfully.',
    schema: { $ref: getSchemaPath(RepairerDto) },
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async createRepairer(@Body() body: CreateRepairerDto) {
    this.logger.log('createRepairer called', body);
    try {
      const result = await firstValueFrom(
        this.repairersService.send({ cmd: 'create_repairer' }, body),
      );
      this.logger.log('createRepairer result', result);
      return result;
    } catch (error) {
      this.logger.error('createRepairer error', error.stack, error);
      throw new HttpException(
        error.message || 'Failed to create repairer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.import')
  @Version('1')
  @Get('/import')
  @ApiOperation({ summary: 'Import repairers' })
  @ApiResponse({ status: 200, description: 'Repairers imported successfully.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async importRepairers() {
    this.logger.log('importRepairers called');
    try {
      const result = await firstValueFrom(
        this.repairersService.send({ cmd: 'import_repairers' }, {}),
      );
      this.logger.log('importRepairers result', result);
      return result;
    } catch (error) {
      this.logger.error('importRepairers error', error.stack, error);
      throw new HttpException(
        error.message || 'Failed to delete repairer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Same permission as the list it draws: markers are a narrower view of the
  // rows `repairer.get_all` already returns, so no new permission is
  // introduced. A new one would need seeding and granting to the guest role
  // before the map worked for signed-out visitors, who are most of its users.
  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.get_all')
  @Version('1')
  @Get('/markers')
  @ApiOperation({
    summary: 'Get repairer markers inside the visible map rectangle',
    description:
      'Returns id, coordinates and partner type only — enough to draw a pin. ' +
      '`total` counts every match inside the bounds even when the response is ' +
      'capped, so the caller can say how many are really there.',
  })
  @ApiResponse({
    status: 200,
    description: 'Markers inside the bounds, capped at `limit`.',
  })
  @ApiResponse({ status: 400, description: 'Missing or invalid bounds.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getRepairerMarkers(@Query() query: MapBoundsQueryDto) {
    const { north, south, east, west, ...filters } = query;
    const startTime = Date.now();
    try {
      const result = await firstValueFrom(
        this.repairersService.send(
          { cmd: 'get_repairer_markers' },
          { bounds: { north, south, east, west }, ...filters },
        ),
      );
      this.logger.log('Repairer map area searched', {
        event: 'repairer_map_search',
        category: 'repairers',
        duration_ms: Date.now() - startTime,
        ...filters,
        result_count: Array.isArray(result) ? result.length : null,
      });
      return result;
    } catch (error) {
      this.logger.error('getRepairerMarkers error', error.stack, error);
      throw new HttpException(
        error.message || 'Failed to get repairer markers',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.get_filters')
  @Version('1')
  @Get('/filters')
  @ApiOperation({ summary: 'Get repairer filters' })
  @ApiResponse({
    status: 200,
    description: 'Returns repairer filters.',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(RepairerFilterDto) },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getRepairersFilters() {
    this.logger.log('getRepairersFilters called');
    try {
      const result = await firstValueFrom(
        this.repairersService.send({ cmd: 'get_repairers_filters' }, {}),
      );
      this.logger.log('getRepairersFilters result', result);
      return result;
    } catch (error) {
      this.logger.error('getRepairersFilters error', error.stack, error);
      throw new HttpException(
        error.message || 'Failed to get repairers filters',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.search')
  @Version('1')
  @Post('/search')
  @ApiOperation({ summary: 'Search for repairers' })
  @ApiBody({
    schema: { type: 'object', additionalProperties: true },
    description: 'Search criteria',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns search results.',
    schema: { type: 'array', items: { $ref: getSchemaPath(RepairerDto) } },
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async searchRepairers(@Body() body: any) {
    this.logger.log('searchRepairers called', body);
    try {
      const result = await firstValueFrom(
        this.repairersService.send({ cmd: 'search_repairers' }, { body }),
      );
      this.logger.log('searchRepairers result', result);
      return result;
    } catch (error) {
      this.logger.error('searchRepairers error', error.stack, error);
      throw new HttpException(
        error.message || 'Failed to search repairers',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.get_by_id')
  @Version('1')
  @Get(':id')
  @ApiOperation({ summary: 'Get repairer by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Repairer ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the repairer with the given ID.',
    schema: { $ref: getSchemaPath(RepairerDto) },
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getRepairer(@Param('id') id: string) {
    this.logger.log('getRepairer called', { id });
    try {
      const result = await firstValueFrom(
        this.repairersService.send({ cmd: 'get_repairer' }, { id }),
      );
      this.logger.log('getRepairer result', result);
      return result;
    } catch (error) {
      this.logger.error('getRepairer error', error.stack, error);
      throw new HttpException(
        error.message || 'Failed to get repairer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.update')
  @Version('1')
  @Post(':id')
  @ApiOperation({ summary: 'Update a repairer' })
  @ApiParam({ name: 'id', type: 'string', description: 'Repairer ID' })
  @ApiBody({
    schema: { $ref: getSchemaPath(UpdateRepairerDto) },
    description: 'Updated repairer data',
  })
  @ApiResponse({
    status: 200,
    description: 'Repairer updated successfully.',
    schema: { $ref: getSchemaPath(RepairerDto) },
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async updateRepairer(
    @Param('id') id: string,
    @Body() body: UpdateRepairerDto,
  ) {
    this.logger.log('updateRepairer called', { id, ...body });
    try {
      const result = await firstValueFrom(
        this.repairersService.send({ cmd: 'update_repairer' }, { id, ...body }),
      );
      this.logger.log('updateRepairer result', result);
      return result;
    } catch (error) {
      this.logger.error('updateRepairer error', error.stack, error);
      throw new HttpException(
        error.message || 'Failed to update repairer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.delete')
  @Version('1')
  @Post(':id/delete')
  @ApiOperation({ summary: 'Delete a repairer' })
  @ApiParam({ name: 'id', type: 'string', description: 'Repairer ID' })
  @ApiResponse({ status: 200, description: 'Repairer deleted successfully.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async deleteRepairer(@Param('id') id: string) {
    this.logger.log('deleteRepairer called', { id });
    try {
      const result = await firstValueFrom(
        this.repairersService.send({ cmd: 'delete_repairer' }, { id }),
      );
      this.logger.log('deleteRepairer result', result);
      return result;
    } catch (error) {
      this.logger.error('deleteRepairer error', error.stack, error);
      throw new HttpException(
        error.message || 'Failed to delete repairer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.find_nearest')
  @Version('1')
  @Post('/nearest')
  @ApiOperation({ summary: 'Find the nearest repairer' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the nearest repairer and distance.',
    schema: { $ref: getSchemaPath(NearestRepairerDto) },
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async findNearestRepairer(
    @Body() body: { latitude: number; longitude: number },
  ) {
    this.logger.log('findNearestRepairer called', body);
    try {
      const result = await firstValueFrom(
        this.repairersService.send({ cmd: 'find_nearest_repairer' }, body),
      );
      this.logger.log('findNearestRepairer result', result);
      return result;
    } catch (error) {
      this.logger.error('findNearestRepairer error', error.stack, error);
      throw new HttpException(
        error.message || 'Failed to find nearest repairer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.report')
  @Version('1')
  @Post(':id/report')
  @ApiOperation({ summary: 'Report a repairer result as irrelevant' })
  @ApiParam({ name: 'id', type: 'string', description: 'Repairer ID' })
  @ApiBody({ type: ReportRepairerDto })
  @ApiResponse({ status: 201, description: 'Report submitted successfully.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async reportRepairer(
    @Param('id') id: string,
    @Body() body: ReportRepairerDto,
  ) {
    this.logger.log('reportRepairer called', { id, ...body });
    try {
      const result = await firstValueFrom(
        this.repairersService.send(
          { cmd: 'report_repairer' },
          { repairer_id: id, reason: body.reason },
        ),
      );
      this.logger.log('Repairer reported', {
        event: 'repairer_reported',
        category: 'repairers',
        repairerId: id,
        reason: body.reason,
      });
      return result;
    } catch (error) {
      this.logger.error('reportRepairer error', error.stack, error);
      throw new HttpException(
        error.message || 'Failed to report repairer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.reports.admin')
  @ApiBearerAuth()
  @Version('1')
  @Get('reports/list')
  @ApiOperation({ summary: 'List repairer reports (admin)' })
  @ApiResponse({ status: 200, description: 'Returns repairer reports.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getRepairerReports(@Query('status') status?: string) {
    this.logger.log('getRepairerReports called', { status });
    try {
      const result = await firstValueFrom(
        this.repairersService.send({ cmd: 'get_repairer_reports' }, { status }),
      );
      this.logger.log('getRepairerReports result', result);
      return result;
    } catch (error) {
      this.logger.error('getRepairerReports error', error.stack, error);
      throw new HttpException(
        error.message || 'Failed to get repairer reports',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.reports.admin')
  @ApiBearerAuth()
  @Version('1')
  @Post('reports/:id/review')
  @ApiOperation({ summary: 'Review a repairer report (admin)' })
  @ApiParam({ name: 'id', type: 'string', description: 'Report ID' })
  @ApiBody({ type: UpdateRepairerReportStatusDto })
  @ApiResponse({ status: 200, description: 'Report reviewed successfully.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async reviewRepairerReport(
    @Param('id') id: string,
    @Body() body: UpdateRepairerReportStatusDto,
    @Req() req: any,
  ) {
    const adminUserId = req.user?.sub ?? req.user?.id ?? null;
    this.logger.log('reviewRepairerReport called', {
      id,
      ...body,
      adminUserId,
    });
    try {
      const result = await firstValueFrom(
        this.repairersService.send(
          { cmd: 'update_repairer_report_status' },
          { id, status: body.status, reviewedBy: adminUserId },
        ),
      );
      this.logger.log('reviewRepairerReport result', result);
      return result;
    } catch (error) {
      this.logger.error('reviewRepairerReport error', error.stack, error);
      throw new HttpException(
        error.message || 'Failed to review repairer report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
