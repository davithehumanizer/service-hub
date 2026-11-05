import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { FlexibleAuthGuard } from '../auth/flexible-auth.guard';
import { PermissionsGuard } from '../auth/permission.guard';
import { Permissions } from '../auth/permission.decorator';
import { SubmitApiToolDto } from './dto/submit-api-tool.dto';
import { ApproveRejectApiToolDto } from './dto/approve-reject-api-tool.dto';
import { ApproveApiToolDto } from './dto/approve-api-tool.dto';

@ApiTags('API Catalog')
@Controller('api-catalog')
export class ApiCatalogController {
  private readonly logger = new Logger(ApiCatalogController.name);

  constructor(
    @Inject('API_CATALOG_SERVICE')
    private readonly apiCatalogService: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all approved API tools' })
  @ApiResponse({ status: 200, description: 'List of approved API tools' })
  async listApproved() {
    this.logger.log('listApprovedTools called');
    try {
      return await firstValueFrom(
        this.apiCatalogService.send({ cmd: 'list_approved_tools' }, {}),
      );
    } catch (error) {
      this.logger.error(
        'listApprovedTools error: ' + error.message,
        error.stack,
      );
      throw new HttpException(
        error.message || 'Error fetching tools',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get API tool by ID' })
  @ApiResponse({ status: 200, description: 'API tool details' })
  @ApiResponse({ status: 404, description: 'API tool not found' })
  async getById(@Param('id') id: string) {
    this.logger.log('getToolById called', { id });
    try {
      const result = await firstValueFrom(
        this.apiCatalogService.send({ cmd: 'get_tool_by_id' }, { id }),
      );
      if (!result) {
        throw new HttpException('API tool not found', HttpStatus.NOT_FOUND);
      }
      return result;
    } catch (error) {
      this.logger.error('getToolById error: ' + error.message, error.stack);
      throw new HttpException(
        error.message || 'Error fetching tool',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('api_catalog.submit')
  @ApiBearerAuth()
  @Post('submit')
  @ApiOperation({ summary: 'Submit a new API tool for review' })
  @ApiResponse({
    status: 201,
    description: 'API tool submitted, pending approval',
  })
  @ApiBody({ type: SubmitApiToolDto })
  async submit(@Body() dto: SubmitApiToolDto, @Req() req: any) {
    const submitterUserId = req.user?.sub ?? req.user?.id ?? null;
    this.logger.log('submitTool called', { submitterUserId });
    try {
      return await firstValueFrom(
        this.apiCatalogService.send(
          { cmd: 'submit_tool' },
          { dto, submitterUserId },
        ),
      );
    } catch (error) {
      this.logger.error('submitTool error: ' + error.message, error.stack);
      throw new HttpException(
        error.message || 'Error submitting tool',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('api_catalog.admin')
  @ApiBearerAuth()
  @Get('admin/pending')
  @ApiOperation({ summary: 'List all pending API tool submissions (admin)' })
  @ApiResponse({ status: 200, description: 'List of pending API tools' })
  async listPending(@Req() req: any) {
    this.logger.log('listPendingTools called');
    try {
      return await firstValueFrom(
        this.apiCatalogService.send({ cmd: 'list_pending_tools' }, {}),
      );
    } catch (error) {
      this.logger.error(
        'listPendingTools error: ' + error.message,
        error.stack,
      );
      throw new HttpException(
        error.message || 'Error fetching pending tools',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('api_catalog.admin')
  @ApiBearerAuth()
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve an API tool submission (admin)' })
  @ApiResponse({ status: 200, description: 'API tool approved' })
  @ApiBody({ type: ApproveApiToolDto })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveApiToolDto,
    @Req() req: any,
  ) {
    const adminUserId = req.user?.sub ?? req.user?.id ?? null;
    this.logger.log('approveTool called', { id, adminUserId });
    try {
      return await firstValueFrom(
        this.apiCatalogService.send(
          { cmd: 'approve_tool' },
          { id, adminUserId, isCommunity: dto?.isCommunity },
        ),
      );
    } catch (error) {
      this.logger.error('approveTool error: ' + error.message, error.stack);
      throw new HttpException(
        error.message || 'Error approving tool',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('api_catalog.admin')
  @ApiBearerAuth()
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject an API tool submission (admin)' })
  @ApiResponse({ status: 200, description: 'API tool rejected' })
  @ApiBody({ type: ApproveRejectApiToolDto })
  async reject(
    @Param('id') id: string,
    @Body() dto: ApproveRejectApiToolDto,
    @Req() req: any,
  ) {
    const adminUserId = req.user?.sub ?? req.user?.id ?? null;
    this.logger.log('rejectTool called', { id, adminUserId });
    try {
      return await firstValueFrom(
        this.apiCatalogService.send(
          { cmd: 'reject_tool' },
          { id, adminUserId, reason: dto.reason },
        ),
      );
    } catch (error) {
      this.logger.error('rejectTool error: ' + error.message, error.stack);
      throw new HttpException(
        error.message || 'Error rejecting tool',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
