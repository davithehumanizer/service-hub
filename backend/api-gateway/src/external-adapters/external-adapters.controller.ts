import {
  Controller,
  Get,
  Query,
  Inject,
  Param,
  Logger,
  Version,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { FixometerImpactMetricsQueryDto } from './dto/fixometer-impact-metrics-query.dto';
import { IfixitSearchQueryDto } from './dto/ifixit-search-query.dto';
import { IfixitSuggestQueryDto } from './dto/ifixit-suggest-query.dto';
import { IfixitPaginationQueryDto } from './dto/ifixit-pagination-query.dto';
import { YoutubeSearchQueryDto } from './dto/youtube-search-query.dto';
import { ExternalAdapterResponseDto } from './dto/response/external-adapter-response.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('External Adapters')
@Controller('external-adapters')
export class ExternalAdaptersController {
  private readonly logger = new Logger(ExternalAdaptersController.name);

  constructor(
    @Inject('EXTERNAL_ADAPTERS_SERVICE')
    private readonly externalAdaptersService: ClientProxy,
    @Inject('DEVICES_SERVICE')
    private readonly devicesService: ClientProxy,
  ) {}

  @Version('1')
  @Get('fixometer/impact-metrics')
  @ApiOperation({ summary: 'Fetch impact metrics from Fixometer' })
  @ApiQuery({ name: 'deviceType', type: String, description: 'Type of device' })
  @ApiQuery({
    name: 'weight',
    type: Number,
    description: 'Weight of the device in kg',
  })
  @ApiResponse({
    status: 200,
    description: 'Impact metrics retrieved successfully',
    type: ExternalAdapterResponseDto,
  })
  async fetchFixometerImpactMetrics(
    @Query() query: FixometerImpactMetricsQueryDto,
  ): Promise<ExternalAdapterResponseDto> {
    const startTime = Date.now();
    this.logger.log('Fixometer impact calculation requested', {
      event: 'fixometer_calculation_request',
      category: 'fixometer',
      device_type: query.deviceType,
      weight: query.weight,
    });
    try {
      // No device-category lookup and no weight any more: the reference data
      // gives CO2e per category, so the name is the whole input.
      const result: unknown = await firstValueFrom(
        this.externalAdaptersService.send(
          { cmd: 'fetch-impact-metrics' },
          { deviceType: query.deviceType },
        ),
      );
      this.logger.log('Fixometer impact calculation succeeded', {
        event: 'fixometer_calculation_success',
        category: 'fixometer',
        duration_ms: Date.now() - startTime,
        device_type: query.deviceType,
      });
      return plainToInstance(ExternalAdapterResponseDto, {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Fixometer impact calculation failed', {
        event: 'fixometer_calculation_failure',
        category: 'fixometer',
        duration_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : String(error),
      });
      return plainToInstance(ExternalAdapterResponseDto, {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Version('1')
  @Get('ifixit/search')
  @ApiOperation({ summary: 'Search iFixit devices' })
  @ApiQuery({ name: 'query', type: String, description: 'Search query' })
  @ApiQuery({
    name: 'type',
    type: String,
    description: 'Device type',
    required: false,
  })
  @ApiQuery({
    name: 'subject',
    type: String,
    description: 'Subject category',
    required: false,
  })
  @ApiQuery({
    name: 'difficulty',
    type: String,
    description: 'Difficulty level',
    required: false,
  })
  @ApiQuery({
    name: 'brand',
    type: String,
    description:
      'Device brand, used to build a more specific search candidate before falling back to query alone',
    required: false,
  })
  @ApiQuery({
    name: 'category',
    type: String,
    description:
      'Device category, used as a last-resort fallback search candidate',
    required: false,
  })
  @ApiQuery({
    name: 'categoryWikiId',
    type: String,
    description:
      "The iFixit wiki mapped to the device's category (device_categories.ifixit_wikiid), read before any free-text fallback",
    required: false,
  })
  @ApiQuery({
    name: 'lang',
    enum: ['en', 'fr', 'de', 'nl'],
    description:
      "Language of the guides' titles, subjects and links, from iFixit's own translations",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: ExternalAdapterResponseDto,
  })
  async searchIfixitDevice(
    @Query() query: IfixitSearchQueryDto,
  ): Promise<ExternalAdapterResponseDto> {
    const startTime = Date.now();
    this.logger.log('iFixit device search requested', {
      event: 'ifixit_search_request',
      category: 'ifixit',
      search_query: query.query,
      type: query.type,
      subject: query.subject,
    });
    try {
      const result: unknown = await firstValueFrom(
        this.externalAdaptersService.send(
          { cmd: 'search-device-ifixit' },
          {
            query: query.query,
            type: query.type,
            subject: query.subject,
            difficulty: query.difficulty,
            brand: query.brand,
            category: query.category,
            categoryWikiId: query.categoryWikiId,
            lang: query.lang,
          },
        ),
      );
      this.logger.log('iFixit device search succeeded', {
        event: 'ifixit_search_success',
        category: 'ifixit',
        duration_ms: Date.now() - startTime,
      });
      return plainToInstance(ExternalAdapterResponseDto, {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('iFixit device search failed', {
        event: 'ifixit_search_failure',
        category: 'ifixit',
        duration_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : String(error),
      });
      return plainToInstance(ExternalAdapterResponseDto, {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Version('1')
  @Get('ifixit/suggest')
  @ApiOperation({ summary: 'Autocomplete/suggest iFixit device wikis' })
  @ApiQuery({ name: 'query', type: String, description: 'Partial device name' })
  @ApiResponse({
    status: 200,
    description: 'Suggestions retrieved successfully',
    type: ExternalAdapterResponseDto,
  })
  async suggestIfixitDevice(
    @Query() query: IfixitSuggestQueryDto,
  ): Promise<ExternalAdapterResponseDto> {
    const startTime = Date.now();
    this.logger.log('iFixit suggest requested', {
      event: 'ifixit_suggest_request',
      category: 'ifixit',
      search_query: query.query,
    });
    try {
      const result: unknown = await firstValueFrom(
        this.externalAdaptersService.send(
          { cmd: 'suggest-device-ifixit' },
          { query: query.query },
        ),
      );
      this.logger.log('iFixit suggest succeeded', {
        event: 'ifixit_suggest_success',
        category: 'ifixit',
        duration_ms: Date.now() - startTime,
      });
      return plainToInstance(ExternalAdapterResponseDto, {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('iFixit suggest failed', {
        event: 'ifixit_suggest_failure',
        category: 'ifixit',
        duration_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : String(error),
      });
      return plainToInstance(ExternalAdapterResponseDto, {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Version('1')
  @Get('youtube/search')
  // Unauthenticated, and every miss spends Google quota: a search.list call
  // costs 100 units of a 10,000/day allowance, so the whole platform gets
  // ~100 searches a day. The adapter caches for a week and caps its own daily
  // budget; this keeps a single caller from draining it in a minute.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Search YouTube for repair tutorial videos' })
  @ApiQuery({ name: 'query', type: String, description: 'Search query' })
  @ApiResponse({
    status: 200,
    description: 'Videos retrieved successfully',
    type: ExternalAdapterResponseDto,
  })
  async searchYoutubeVideos(
    @Query() query: YoutubeSearchQueryDto,
  ): Promise<ExternalAdapterResponseDto> {
    const startTime = Date.now();
    this.logger.log('YouTube video search requested', {
      event: 'youtube_search_request',
      category: 'youtube',
      search_query: query.query,
    });
    try {
      const result: unknown = await firstValueFrom(
        this.externalAdaptersService.send(
          { cmd: 'search-videos-youtube' },
          { query: query.query },
        ),
      );
      this.logger.log('YouTube video search succeeded', {
        event: 'youtube_search_success',
        category: 'youtube',
        duration_ms: Date.now() - startTime,
      });
      return plainToInstance(ExternalAdapterResponseDto, {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('YouTube video search failed', {
        event: 'youtube_search_failure',
        category: 'youtube',
        duration_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : String(error),
      });
      return plainToInstance(ExternalAdapterResponseDto, {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Version('1')
  @Get('ifixit/devices')
  @ApiOperation({ summary: 'Get all iFixit devices with pagination' })
  @ApiQuery({
    name: 'page',
    type: Number,
    description: 'Page number',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    description: 'Items per page',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Devices retrieved successfully',
    type: ExternalAdapterResponseDto,
  })
  async getAllIfixitDevices(
    @Query() query: IfixitPaginationQueryDto,
  ): Promise<ExternalAdapterResponseDto> {
    const startTime = Date.now();
    this.logger.log('iFixit devices list requested', {
      event: 'ifixit_devices_list_request',
      category: 'ifixit',
      page: query.page,
      limit: query.limit,
    });
    try {
      const result: unknown = await firstValueFrom(
        this.externalAdaptersService.send(
          { cmd: 'get-all-devices-ifixit' },
          { page: query.page, limit: query.limit },
        ),
      );
      this.logger.log('iFixit devices list succeeded', {
        event: 'ifixit_devices_list_success',
        category: 'ifixit',
        duration_ms: Date.now() - startTime,
      });
      return plainToInstance(ExternalAdapterResponseDto, {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('iFixit devices list failed', {
        event: 'ifixit_devices_list_failure',
        category: 'ifixit',
        duration_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : String(error),
      });
      return plainToInstance(ExternalAdapterResponseDto, {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Version('1')
  @Get('ifixit/devices/:id')
  @ApiOperation({ summary: 'Get iFixit device by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Device ID' })
  @ApiResponse({
    status: 200,
    description: 'Device retrieved successfully',
    type: ExternalAdapterResponseDto,
  })
  async getIfixitDeviceById(
    @Param('id') id: string,
  ): Promise<ExternalAdapterResponseDto> {
    const startTime = Date.now();
    this.logger.log('iFixit device view requested', {
      event: 'ifixit_device_view_request',
      category: 'ifixit',
      device_id: id,
    });
    try {
      const result: unknown = await firstValueFrom(
        this.externalAdaptersService.send(
          { cmd: 'get-device-by-id-ifixit' },
          { id },
        ),
      );
      this.logger.log('iFixit device view succeeded', {
        event: 'ifixit_device_view_success',
        category: 'ifixit',
        duration_ms: Date.now() - startTime,
        device_id: id,
      });
      return plainToInstance(ExternalAdapterResponseDto, {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('iFixit device view failed', {
        event: 'ifixit_device_view_failure',
        category: 'ifixit',
        duration_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : String(error),
      });
      return plainToInstance(ExternalAdapterResponseDto, {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Version('1')
  @Get('ifixit/devices/:id/parts')
  @ApiOperation({ summary: 'Get iFixit device parts' })
  @ApiParam({ name: 'id', type: String, description: 'Device ID' })
  @ApiResponse({
    status: 200,
    description: 'Device parts retrieved successfully',
    type: ExternalAdapterResponseDto,
  })
  async getIfixitDeviceParts(
    @Param('id') id: string,
  ): Promise<ExternalAdapterResponseDto> {
    const startTime = Date.now();
    this.logger.log('iFixit device parts requested', {
      event: 'ifixit_parts_request',
      category: 'ifixit',
      device_id: id,
    });
    try {
      const result: unknown = await firstValueFrom(
        this.externalAdaptersService.send(
          { cmd: 'get-device-parts-ifixit' },
          { id },
        ),
      );
      this.logger.log('iFixit device parts succeeded', {
        event: 'ifixit_parts_success',
        category: 'ifixit',
        duration_ms: Date.now() - startTime,
        device_id: id,
      });
      return plainToInstance(ExternalAdapterResponseDto, {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('iFixit device parts failed', {
        event: 'ifixit_parts_failure',
        category: 'ifixit',
        duration_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : String(error),
      });
      return plainToInstance(ExternalAdapterResponseDto, {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Version('1')
  @Get('ifixit/devices/:id/guide/:guideid')
  @ApiOperation({ summary: 'Get iFixit device repair guide' })
  @ApiParam({ name: 'id', type: String, description: 'Device ID' })
  @ApiParam({ name: 'guideid', type: String, description: 'Guide ID' })
  @ApiResponse({
    status: 200,
    description: 'Device guide retrieved successfully',
    type: ExternalAdapterResponseDto,
  })
  async getIfixitDeviceGuide(
    @Param('id') id: string,
    @Param('guideid') guideid: string,
  ): Promise<ExternalAdapterResponseDto> {
    const startTime = Date.now();
    this.logger.log('iFixit guide view requested', {
      event: 'ifixit_guide_view_request',
      category: 'ifixit',
      device_id: id,
      guide_id: guideid,
    });
    try {
      const result: unknown = await firstValueFrom(
        this.externalAdaptersService.send(
          { cmd: 'get-device-guide-ifixit' },
          { id, guideid },
        ),
      );
      this.logger.log('iFixit guide view succeeded', {
        event: 'ifixit_guide_view_success',
        category: 'ifixit',
        duration_ms: Date.now() - startTime,
        device_id: id,
        guide_id: guideid,
      });
      return plainToInstance(ExternalAdapterResponseDto, {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('iFixit guide view failed', {
        event: 'ifixit_guide_view_failure',
        category: 'ifixit',
        duration_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : String(error),
      });
      return plainToInstance(ExternalAdapterResponseDto, {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
