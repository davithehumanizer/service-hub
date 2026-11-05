import {
  Controller,
  Get,
  Query,
  Param,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  Version,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SparePartsService } from './spare-parts.service';

@ApiTags('Spare Parts')
@Controller('spare-parts')
export class SparePartsController {
  private readonly logger = new Logger(SparePartsController.name);

  constructor(private readonly sparePartsService: SparePartsService) {}

  @Version('1')
  @Get('by-device')
  @ApiOperation({
    summary: 'Search spare parts compatible with a specific device',
  })
  @ApiQuery({ name: 'brand', type: String, required: true })
  @ApiQuery({ name: 'model', type: String, required: true })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({
    status: 200,
    description: 'Spare parts for the device returned successfully',
  })
  async searchByDevice(
    @Query('brand') brand: string,
    @Query('model') model: string,
    @Query('offset') offset = 0,
    @Query('limit') limit = 20,
  ) {
    const startTime = Date.now();
    try {
      const result = await this.sparePartsService.searchByDevice({
        brand,
        model,
        offset: Number(offset),
        limit: Number(limit),
      });
      this.logger.log('Spare parts searched for a device', {
        event: 'spare_parts_device_search',
        category: 'spare_parts',
        duration_ms: Date.now() - startTime,
        brand,
        model,
        result_count: result?.estimatedTotalHits ?? 0,
      });
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to search spare parts by device: ${error?.message}`,
      );
      return { hits: [], estimatedTotalHits: 0 };
    }
  }

  @Version('1')
  @Get('search')
  @ApiOperation({ summary: 'Search spare parts in Meilisearch' })
  @ApiQuery({
    name: 'q',
    type: String,
    required: false,
    description: 'Search query',
  })
  @ApiQuery({
    name: 'brand',
    type: String,
    required: false,
    description: 'Filter by brand',
  })
  @ApiQuery({
    name: 'category',
    type: String,
    required: false,
    description: 'Filter by category',
  })
  @ApiQuery({
    name: 'offset',
    type: Number,
    required: false,
    description: 'Pagination offset',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of results per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results returned successfully',
  })
  async search(
    @Query('q') q = '',
    @Query('brand') brand?: string,
    @Query('category') category?: string,
    @Query('offset') offset = 0,
    @Query('limit') limit = 20,
  ) {
    try {
      return await this.sparePartsService.search({
        q,
        brand,
        category,
        offset: Number(offset),
        limit: Number(limit),
      });
    } catch (error) {
      this.logger.error(`Failed to search spare parts: ${error?.message}`);
      return { hits: [], estimatedTotalHits: 0 };
    }
  }

  @Version('1')
  @Get('multi-search')
  @ApiOperation({
    summary: 'Multi-index search across spare parts, devices and repairers',
  })
  @ApiQuery({
    name: 'q',
    type: String,
    required: true,
    description: 'Search query',
  })
  @ApiResponse({
    status: 200,
    description: 'Multi-search results returned successfully',
  })
  async multiSearch(@Query('q') q: string) {
    try {
      return await this.sparePartsService.multiSearch(q || '');
    } catch (error) {
      this.logger.error(`Failed to multi-search: ${error?.message}`);
      return { results: [] };
    }
  }

  @Version('1')
  @Get()
  @ApiOperation({ summary: 'List spare parts with pagination' })
  @ApiQuery({
    name: 'offset',
    type: Number,
    required: false,
    description: 'Pagination offset',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of results per page',
  })
  @ApiResponse({ status: 200, description: 'Spare parts listed successfully' })
  async list(@Query('offset') offset = 0, @Query('limit') limit = 20) {
    try {
      return await this.sparePartsService.list({
        offset: Number(offset),
        limit: Number(limit),
      });
    } catch (error) {
      this.logger.error(`Failed to list spare parts: ${error?.message}`);
      return { hits: [], estimatedTotalHits: 0 };
    }
  }

  @Version('1')
  @Get(':id')
  @ApiOperation({ summary: 'Get spare part by ID' })
  @ApiResponse({
    status: 200,
    description: 'Spare part retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Spare part not found' })
  @ApiResponse({
    status: 503,
    description: 'Spare parts catalogue unavailable',
  })
  async getById(@Param('id') id: string) {
    try {
      const result = await this.sparePartsService.getById(id);
      if (!result) throw new NotFoundException('Spare part not found');
      this.logger.log('Spare part viewed', {
        event: 'spare_part_viewed',
        category: 'spare_parts',
        sparePartId: id,
      });
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to get spare part: ${error?.message}`);
      // An outage says nothing about the part: it is not "not found".
      throw new ServiceUnavailableException(
        'Spare parts catalogue unavailable',
      );
    }
  }
}
