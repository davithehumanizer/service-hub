import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Headers,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';

@ApiTags('Repair Monitor')
@Controller('repair-monitor/categories')
export class RepairCategoryController {
  private readonly logger = new Logger(RepairCategoryController.name);

  constructor(
    @Inject('REPAIR_MONITOR_SERVICE')
    private readonly repairMonitorService: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all repair categories with device mappings' })
  @ApiResponse({ status: 200, description: 'List of repair categories' })
  async findAll(@Headers('accept-language') acceptLanguage?: string) {
    const locale = acceptLanguage?.split(',')[0]?.slice(0, 2) || 'en';
    try {
      return await firstValueFrom(
        this.repairMonitorService.send(
          { cmd: 'get_repair_categories' },
          { locale },
        ),
      );
    } catch (error) {
      this.logger.error('findAll repair categories error: ' + error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('by-device/:id')
  @ApiOperation({
    summary: 'Get repair category matching a device category ID',
  })
  @ApiResponse({ status: 200, description: 'Matching repair category or null' })
  async findByDeviceCategory(@Param('id', ParseIntPipe) id: number) {
    try {
      return await firstValueFrom(
        this.repairMonitorService.send(
          { cmd: 'get_repair_category_by_device_category' },
          { deviceCategoryId: id },
        ),
      );
    } catch (error) {
      this.logger.error('findByDeviceCategory error: ' + error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
