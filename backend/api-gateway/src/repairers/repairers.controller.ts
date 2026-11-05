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
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
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
import { authorOf, editorOf } from 'src/auth/author';
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
import {
  ChangeRepairerProposalDto,
  ProposeRepairerDto,
  ReviewRepairerProposalDto,
  ReviewRepairerRevisionDto,
} from './dto/propose-repairer.dto';

/** The HTTP status of a refusal from repairers-service, by its message. */
const statusOf = (message: string): HttpStatus =>
  /not found/i.test(message)
    ? HttpStatus.NOT_FOUND
    : /^only /i.test(message)
      ? HttpStatus.FORBIDDEN
      : /already been reviewed|changed since|replaced since/i.test(message)
        ? HttpStatus.CONFLICT
        : /is required$/i.test(message)
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.INTERNAL_SERVER_ERROR;

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
  ProposeRepairerDto,
  ChangeRepairerProposalDto,
  ReviewRepairerProposalDto,
  ReviewRepairerRevisionDto,
)
@Controller('repairers')
export class RepairersController {
  private readonly logger = new Logger(RepairersController.name);
  constructor(
    @Inject('REPAIRERS_SERVICE') private readonly repairersService: ClientProxy,
    @Inject('USER_SERVICE') private readonly users: ClientProxy,
  ) {}

  /**
   * Each item of the queue with who proposed it. The queue is shown
   * without them if the accounts cannot be read.
   */
  private async withAuthors(queue: any) {
    const items = [
      ...queue.proposals,
      ...queue.revisions,
      ...queue.refused.proposals,
      ...queue.refused.revisions,
    ];
    const ids = [
      ...new Set(
        items.map((item) => item.created_by).filter((id) => id != null),
      ),
    ];
    let authors: any[] = [];
    try {
      authors = ids.length
        ? await firstValueFrom(
            this.users.send({ cmd: 'get_user_summaries' }, { ids }),
          )
        : [];
    } catch (error) {
      this.logger.warn(`get_user_summaries error: ${error?.message}`);
    }
    for (const item of items) {
      item.author = authors.find((a) => a.id === item.created_by) ?? null;
    }
    return queue;
  }

  /**
   * Emails the author what was decided; an administrator deciding about
   * their own is not told. Never holds up the decision, already made.
   */
  private notify(
    authorId: number | null | undefined,
    reviewer: number | null,
    decision: 'published' | 'rejected' | 'applied' | 'change_rejected',
    repairer: { repairer_id?: string; name?: string } | undefined,
    note?: string,
  ) {
    if (authorId == null || authorId === reviewer || !repairer?.repairer_id) {
      return;
    }
    this.users
      .emit(
        { cmd: 'notify_repairer_decision' },
        {
          userId: authorId,
          decision,
          repairerId: repairer.repairer_id,
          repairerName: repairer.name ?? '',
          note: note ?? null,
        },
      )
      .subscribe({
        error: (error) =>
          this.logger.warn(`notify_repairer_decision error: ${error?.message}`),
      });
  }

  /** Sends a command; a refusal keeps its message and gets its status. */
  private async call(cmd: string, payload: unknown, failure: string) {
    try {
      return await firstValueFrom(this.repairersService.send({ cmd }, payload));
    } catch (error) {
      const message: string = error?.message || failure;
      this.logger.error(`${cmd} error`, error?.stack, error);
      throw new HttpException(message, statusOf(message));
    }
  }

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
  async createRepairer(@Body() body: CreateRepairerDto, @Req() req: any) {
    this.logger.log('createRepairer called', body);
    try {
      const result = await firstValueFrom(
        this.repairersService.send(
          { cmd: 'create_repairer' },
          { ...body, ...authorOf(req) },
        ),
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
  @Permissions('repairer.propose')
  @ApiBearerAuth()
  @Version('1')
  @Post('proposals')
  @ApiOperation({
    summary: 'Propose a repairer',
    description:
      'Hidden until an administrator publishes it; an administrator\'s own ' +
      'proposal is published at once. A contributor\'s is demonstration data.',
  })
  @ApiBody({ type: ProposeRepairerDto })
  @ApiResponse({
    status: 201,
    description: 'The repairer, pending unless proposed by an administrator.',
    schema: { $ref: getSchemaPath(RepairerDto) },
  })
  @ApiResponse({ status: 400, description: 'Invalid or missing field.' })
  async proposeRepairer(@Body() body: ProposeRepairerDto, @Req() req: any) {
    return this.call(
      'propose_repairer',
      { changes: body, editor: editorOf(req) },
      'Failed to propose repairer',
    );
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.propose')
  @ApiBearerAuth()
  @Version('1')
  @Get('proposals/mine')
  @ApiOperation({
    summary: 'The repairers the signed-in user proposed',
    description:
      'Whatever their status, each with its latest change not yet applied ' +
      '(waiting, or refused with its reason) as `revision`.',
  })
  @ApiResponse({ status: 200, description: 'Newest first.' })
  async getMyRepairers(@Req() req: any) {
    return this.call(
      'get_my_repairers',
      { editor: editorOf(req) },
      'Failed to get your repairers',
    );
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.proposals.admin')
  @ApiBearerAuth()
  @Version('1')
  @Get('proposals/pending')
  @ApiOperation({
    summary: 'Proposals and changes waiting for review (admin)',
    description:
      '`proposals`: new repairers, each with the `version` its review ' +
      'names; `revisions`: changes to published ones, each with the ' +
      'repairer as it is now. Oldest first.',
  })
  @ApiResponse({
    status: 200,
    description:
      '{ proposals, revisions, refused: { proposals, revisions } }, each ' +
      'item with its `author` (id, email, role, names) or null.',
  })
  async getPendingProposals() {
    return this.withAuthors(
      await this.call(
        'get_pending_repairer_proposals',
        {},
        'Failed to get pending repairer proposals',
      ),
    );
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.proposals.admin')
  @ApiBearerAuth()
  @Version('1')
  @Get('proposals/pending/count')
  @ApiOperation({
    summary: 'How many proposals and changes wait for review (admin)',
  })
  @ApiResponse({ status: 200, description: '{ count }' })
  async countPendingProposals() {
    return this.call(
      'count_pending_repairer_proposals',
      {},
      'Failed to count pending repairer proposals',
    );
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.propose')
  @ApiBearerAuth()
  @Version('1')
  @Patch('proposals/:id')
  @ApiOperation({
    summary: 'Change a repairer one proposed',
    description:
      'By its author or an administrator. Unpublished, the change is made ' +
      'at once (a refused proposal goes back for review); published, it ' +
      'waits for an administrator and the public sees the old version.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Repairer ID' })
  @ApiBody({ type: ChangeRepairerProposalDto })
  @ApiResponse({ status: 200, description: 'The repairer as it is now.' })
  @ApiResponse({ status: 400, description: 'A required field emptied.' })
  @ApiResponse({ status: 403, description: 'Neither its author nor an administrator.' })
  @ApiResponse({ status: 404, description: 'No such repairer.' })
  async changeProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ChangeRepairerProposalDto,
    @Req() req: any,
  ) {
    return this.call(
      'change_repairer_proposal',
      { id, changes: body, editor: editorOf(req) },
      'Failed to change repairer',
    );
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.propose')
  @ApiBearerAuth()
  @Version('1')
  @Delete('proposals/:id')
  @ApiOperation({
    summary: 'Withdraw a proposal',
    description:
      'By its author while it is not published; by an administrator always.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Repairer ID' })
  @ApiResponse({ status: 200, description: 'Withdrawn.' })
  @ApiResponse({ status: 403, description: 'Published, or not its author.' })
  @ApiResponse({ status: 404, description: 'No such repairer.' })
  async withdrawProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.call(
      'withdraw_repairer_proposal',
      { id, editor: editorOf(req) },
      'Failed to withdraw repairer',
    );
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.proposals.admin')
  @ApiBearerAuth()
  @Version('1')
  @Post('proposals/:id/review')
  @ApiOperation({
    summary: 'Publish or refuse a proposal (admin)',
    description:
      'A refused proposal may still be published. Its author is emailed ' +
      'the decision, in the language of their account.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Repairer ID' })
  @ApiBody({ type: ReviewRepairerProposalDto })
  @ApiResponse({ status: 201, description: 'The repairer, reviewed.' })
  @ApiResponse({ status: 404, description: 'No such repairer.' })
  @ApiResponse({
    status: 409,
    description: 'Already reviewed, or changed by its author since loaded.',
  })
  async reviewProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReviewRepairerProposalDto,
    @Req() req: any,
  ) {
    const editor = editorOf(req);
    const reviewed = await this.call(
      'review_repairer_proposal',
      {
        id,
        decision: body.decision,
        note: body.note,
        version: body.version,
        editor,
      },
      'Failed to review proposal',
    );
    this.notify(
      reviewed?.created_by,
      editor.created_by,
      body.decision === 'publish' ? 'published' : 'rejected',
      reviewed,
      body.decision === 'reject' ? body.note : undefined,
    );
    return reviewed;
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('repairer.proposals.admin')
  @ApiBearerAuth()
  @Version('1')
  @Post('revisions/:id/review')
  @ApiOperation({
    summary: 'Apply or refuse a change (admin)',
    description:
      'A refused change may still be applied while its author has made ' +
      'none since (409 otherwise). Its author is emailed the decision.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Revision ID' })
  @ApiBody({ type: ReviewRepairerRevisionDto })
  @ApiResponse({ status: 201, description: 'The change, reviewed.' })
  @ApiResponse({ status: 404, description: 'No such change.' })
  @ApiResponse({ status: 409, description: 'Already reviewed.' })
  async reviewRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReviewRepairerRevisionDto,
    @Req() req: any,
  ) {
    const editor = editorOf(req);
    const reviewed = await this.call(
      'review_repairer_revision',
      { id, decision: body.decision, note: body.note, editor },
      'Failed to review change',
    );
    this.notify(
      reviewed?.created_by,
      editor.created_by,
      body.decision === 'apply' ? 'applied' : 'change_rejected',
      reviewed?.repairer,
      body.decision === 'reject' ? body.note : undefined,
    );
    return reviewed;
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
  @ApiResponse({
    status: 404,
    description: 'No such repairer, or not yet published and not yours.',
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getRepairer(@Param('id') id: string, @Req() req: any) {
    this.logger.log('getRepairer called', { id });
    return this.call(
      'get_repairer',
      { id, viewer: editorOf(req) },
      'Failed to get repairer',
    );
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
  @ApiResponse({ status: 404, description: 'No such repairer.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async deleteRepairer(@Param('id') id: string) {
    this.logger.log('deleteRepairer called', { id });
    return this.call('delete_repairer', { id }, 'Failed to delete repairer');
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
