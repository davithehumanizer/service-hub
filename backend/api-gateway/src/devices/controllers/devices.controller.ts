/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import {
  Controller,
  Inject,
  Get,
  Post,
  Patch,
  Delete,
  UseGuards,
  HttpException,
  HttpStatus,
  Query,
  Param,
  Body,
  Headers,
  Logger,
  Version,
  VERSION_NEUTRAL,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Permissions } from 'src/auth/permission.decorator';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { FlexibleAuthGuard } from 'src/auth/flexible-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiExtraModels,
  ApiConsumes,
  getSchemaPath,
} from '@nestjs/swagger';
import { StorageService } from 'src/storage/storage.service';
import { DeviceFilterDto } from '../dto/device-filter.dto';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { DeviceDto } from '../dto/device.dto';
import { DevicePhotoDto } from '../dto/device-photo.dto';
import { DeviceCategoryDto } from '../dto/device-category.dto';
import { DeviceTechnicalPropertyDto } from '../dto/device-technical-property.dto';
import { GetDevicesV2QueryDto } from '../dto/get-devices-v2-query.dto';
import { GetDevicesV1ResponseDto } from '../dto/get-devices-v1-response.dto';
import { GetDevicesV2ResponseDto } from '../dto/get-devices-v2-response.dto';
import { randomUUID } from 'crypto';
import {
  extensionForMimeType,
  photosUploadOptions,
} from 'src/common/upload.constraints';

@ApiTags('Devices')
@ApiExtraModels(
  CreateDeviceDto,
  DeviceFilterDto,
  DeviceDto,
  DevicePhotoDto,
  DeviceCategoryDto,
  DeviceTechnicalPropertyDto,
  GetDevicesV2QueryDto,
  GetDevicesV2ResponseDto,
)
@Controller('devices')
export class DevicesController {
  private readonly logger = new Logger(DevicesController.name);

  constructor(
    @Inject('DEVICES_SERVICE') private readonly devicesService: ClientProxy,
    private readonly storageService: StorageService,
  ) {}

  // ===== VERSION 1 ENDPOINTS =====

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.read')
  @Version('1')
  @Get()
  @ApiOperation({
    summary: 'Get all devices (v1)',
    description:
      'Retrieve a list of all devices. **API Version 1** - Legacy implementation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all devices.',
    type: GetDevicesV1ResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getAllDevicesV1(): Promise<GetDevicesV1ResponseDto> {
    this.logger.warn('getAllDevices v1 called - ENDPOINT DISABLED');
    throw new HttpException(
      'This endpoint is disabled due to performance issues. Please use v2 API.',
      HttpStatus.GONE,
    );
  }

  // ===== VERSION 2 ENDPOINTS =====

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.read')
  @Version('2')
  @Get()
  @ApiOperation({
    summary: 'Get all devices (v2)',
    description:
      'Retrieve a paginated list of all devices with enhanced filtering options. Replaced by `GET /api/v2/device-models`, one result per model rather than per catalogue entry.',
    deprecated: true,
  })
  @ApiQuery({
    name: 'page',
    type: 'number',
    required: false,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    type: 'number',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'search',
    type: 'string',
    required: false,
    description: 'Search term for device names or models',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of devices.',
    type: GetDevicesV2ResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getAllDevicesV2(
    @Query() query: GetDevicesV2QueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<GetDevicesV2ResponseDto> {
    this.logger.log('getAllDevices v2 called');
    const locale = (acceptLanguage || 'en').split(/[,;]/)[0].trim().slice(0, 2);
    try {
      const result = await firstValueFrom(
        this.devicesService.send({ cmd: 'get_devices_v2' }, { query, locale }),
      );
      this.logger.log('getAllDevices v2 result', { result });
      return result;
    } catch (error) {
      this.logger.error(
        'getAllDevices v2 error: ' + error.message,
        error.stack,
      );
      throw new HttpException(
        error.message || 'Failed to get devices',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.get_filters')
  @Version('1')
  @Get('filters')
  @ApiOperation({ summary: 'Get device filters' })
  @ApiResponse({
    status: 200,
    description: 'Returns device filters.',
    schema: { type: 'array', items: { $ref: getSchemaPath(DeviceFilterDto) } },
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getFilters(@Headers('accept-language') acceptLanguage?: string) {
    this.logger.log('getFilters called');
    console.log('get_filters');
    const locale = (acceptLanguage || 'en').split(/[,;]/)[0].trim().slice(0, 2);
    try {
      const result = await firstValueFrom(
        this.devicesService.send({ cmd: 'get_filters' }, { locale }),
      );
      this.logger.log('getFilters result', { result });
      return result;
    } catch (error) {
      this.logger.error('getFilters error: ' + error.message, error.stack);
      throw new HttpException(
        error.message || 'Failed to get devices filters',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.search')
  @Version('1')
  @Get('search')
  @ApiOperation({
    summary: 'Search for devices',
    description:
      'Replaced by `GET /api/v2/device-models`, one result per model rather than per catalogue entry.',
    deprecated: true,
  })
  @ApiQuery({ name: 'query', type: 'string', description: 'Search query' })
  @ApiQuery({
    name: 'strict',
    type: 'boolean',
    required: false,
    description: 'Strict phrase match on brand + model',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns search results.',
    schema: { type: 'array', items: { $ref: getSchemaPath(DeviceDto) } },
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async searchDevices(
    @Query('query') query: string,
    @Query('strict') strict?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    this.logger.log('searchDevices called', query);
    console.log('search_devices', query);
    const locale = (acceptLanguage || 'en').split(/[,;]/)[0].trim().slice(0, 2);
    try {
      const result = await firstValueFrom(
        this.devicesService.send(
          { cmd: 'search_devices' },
          { query, strict: strict === 'true', locale },
        ),
      );
      this.logger.log('searchDevices result', { result });
      return result;
    } catch (error) {
      this.logger.error('searchDevices error: ' + error.message, error.stack);
      throw new HttpException(
        error.message || 'Failed to search devices',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.getByIds')
  @Version('1')
  @Get('byIds')
  @ApiOperation({ summary: 'Get devices by IDs' })
  @ApiQuery({
    name: 'ids',
    type: 'string',
    description: 'Comma-separated list of device IDs',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns devices for the given IDs.',
    schema: { type: 'array', items: { $ref: getSchemaPath(DeviceDto) } },
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getDevicesByIds(
    @Query('ids') ids: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    this.logger.log('getDevicesByIds called', ids);
    console.log('get_devices_by_ids', ids);
    const locale = (acceptLanguage || 'en').split(/[,;]/)[0].trim().slice(0, 2);
    try {
      const idsArray = ids.split(',').map(Number);
      const result = await firstValueFrom(
        this.devicesService.send(
          { cmd: 'get_devices_by_ids' },
          { ids: idsArray, locale },
        ),
      );
      this.logger.log('getDevicesByIds result', { result });
      return result;
    } catch (error) {
      this.logger.error('getDevicesByIds error: ' + error.message, error.stack);
      throw new HttpException(
        error.message || 'Failed to get devices',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.getByUrn')
  @Version('1')
  @Get('urn/:urn')
  @ApiOperation({
    summary: 'Get device by URN',
    description:
      'Retrieve a device using its Uniform Resource Name (URN). URN format: urn:care2repair:device:{id}',
  })
  @ApiParam({
    name: 'urn',
    type: 'string',
    description: 'Device URN (e.g., urn:care2repair:device:1)',
    example: 'urn:care2repair:device:1',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the device with the given URN.',
    schema: { $ref: getSchemaPath(DeviceDto) },
  })
  @ApiResponse({ status: 404, description: 'Device not found.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getDeviceByUrn(
    @Param('urn') urn: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    this.logger.log('getDeviceByUrn called', urn);
    console.log('get_device_by_urn', urn);
    const locale = (acceptLanguage || 'en').split(/[,;]/)[0].trim().slice(0, 2);
    try {
      const result = await firstValueFrom(
        this.devicesService.send({ cmd: 'get_device_by_urn' }, { urn, locale }),
      );
      this.logger.log('getDeviceByUrn result', { result });
      return result;
    } catch (error) {
      this.logger.error('getDeviceByUrn error: ' + error.message, error.stack);
      throw new HttpException(
        error.message || 'Failed to get device by URN',
        error.message.includes('not found')
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.getBySourceId')
  @Version('1')
  @Get('source/:sourceId')
  @ApiOperation({
    summary: 'Get device by Source ID',
    description: 'Retrieve a device using its Source ID (e.g. Icecat ID).',
  })
  @ApiParam({
    name: 'sourceId',
    type: 'string',
    description: 'Device Source ID',
    example: '12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the device with the given Source ID.',
    schema: { $ref: getSchemaPath(DeviceDto) },
  })
  @ApiResponse({ status: 404, description: 'Device not found.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getDeviceBySourceId(@Param('sourceId') sourceId: string) {
    this.logger.log('getDeviceBySourceId called', sourceId);
    console.log('get_device_by_source_id', sourceId);
    try {
      const result = await firstValueFrom(
        this.devicesService.send(
          { cmd: 'get_device_by_source_id' },
          { sourceId },
        ),
      );
      this.logger.log('getDeviceBySourceId result', { result });
      return result;
    } catch (error) {
      this.logger.error(
        'getDeviceBySourceId error: ' + error.message,
        error.stack,
      );
      throw new HttpException(
        error.message || 'Failed to get device by Source ID',
        error.message.includes('not found')
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.getById')
  @Version('1')
  @Get(':id')
  @ApiOperation({ summary: 'Get device by ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'Device ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the device with the given ID.',
    schema: { $ref: getSchemaPath(DeviceDto) },
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getDeviceById(
    @Param('id') id: number,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    this.logger.log('getDeviceById called', String(id));
    console.log('get_device_by_id', id);
    const locale = (acceptLanguage || 'en').split(/[,;]/)[0].trim().slice(0, 2);
    try {
      const result = await firstValueFrom(
        this.devicesService.send({ cmd: 'get_device_by_id' }, { id, locale }),
      );
      this.logger.log('getDeviceById result', { result });
      return result;
    } catch (error) {
      this.logger.error('getDeviceById error: ' + error.message, error.stack);
      throw new HttpException(
        error.message || 'Failed to get device',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.create')
  @Version('1')
  @ApiOperation({ summary: 'Create a new device' })
  @ApiBody({ type: CreateDeviceDto })
  @ApiResponse({
    status: 201,
    description: 'Device created.',
    schema: { $ref: getSchemaPath(DeviceDto) },
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @Post()
  async createDevice(@Body() body: CreateDeviceDto) {
    this.logger.log('createDevice called');
    console.log('create_device', body);
    try {
      // Forward categories array as part of the payload
      const payload = { ...body };
      // If legacy device_category is present, convert to categories array
      if ((body as any).device_category && !body.categories) {
        payload.categories = [(body as any).device_category];
        delete (payload as any).device_category;
      }
      const result = await firstValueFrom(
        this.devicesService.send({ cmd: 'create_device' }, payload),
      );
      this.logger.log('createDevice result', { result });
      return result;
    } catch (error) {
      this.logger.error('createDevice error: ' + error.message, error.stack);
      throw new HttpException(
        error.message || 'Failed to create device',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.update')
  @Version('1')
  @ApiOperation({ summary: 'Update a device' })
  @ApiBody({ type: CreateDeviceDto })
  @ApiParam({ name: 'id', type: 'number', description: 'Device ID' })
  @ApiResponse({
    status: 200,
    description: 'Device updated.',
    schema: { $ref: getSchemaPath(DeviceDto) },
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @Patch(':id')
  async updateDevice(@Param('id') id: number, @Body() body: CreateDeviceDto) {
    this.logger.log('updateDevice called', String(id));
    console.log('update_device', id, body);
    try {
      // Forward categories array as part of the payload
      const payload = { ...body };
      // If legacy device_category is present, convert to categories array
      if ((body as any).device_category && !body.categories) {
        payload.categories = [(body as any).device_category];
        delete (payload as any).device_category;
      }
      const result = await firstValueFrom(
        this.devicesService.send({ cmd: 'update_device' }, { id, payload }),
      );
      this.logger.log('updateDevice result', { result });
      return result;
    } catch (error) {
      this.logger.error('updateDevice error: ' + error.message, error.stack);
      throw new HttpException(
        error.message || 'Failed to update device',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.photos.upload')
  @Version('1')
  @Post(':id/photos')
  @UseInterceptors(FilesInterceptor('photos', 10, photosUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload photos for a device' })
  @ApiParam({ name: 'id', type: 'number', description: 'Device ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Photos uploaded.',
    type: [DevicePhotoDto],
  })
  @ApiResponse({
    status: 400,
    description: 'No file, or one that is not a JPEG, PNG or WebP image.',
  })
  @ApiResponse({ status: 413, description: 'A file over 10 MB.' })
  async uploadDevicePhotos(
    @Param('id') id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    this.logger.log(`uploadDevicePhotos called for device ${id}`);

    if (!files || files.length === 0) {
      throw new HttpException('No files uploaded', HttpStatus.BAD_REQUEST);
    }

    try {
      const photoUrls = await Promise.all(
        files.map((file) => {
          const filename = `${randomUUID()}${extensionForMimeType(file.mimetype)}`;
          return this.storageService.uploadFile(file.buffer, {
            folder: `devices/${id}`,
            filename,
            mimeType: file.mimetype,
          });
        }),
      );

      const result = await firstValueFrom(
        this.devicesService.send(
          { cmd: 'add_device_photos' },
          { deviceId: Number(id), photoUrls },
        ),
      );
      return result;
    } catch (error) {
      this.logger.error(
        'uploadDevicePhotos error: ' + error.message,
        error.stack,
      );
      throw new HttpException(
        error.message || 'Failed to upload photos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.photos.admin')
  @Version('1')
  @Delete(':id/photos/:photoId')
  @ApiOperation({
    summary: 'Delete a photo from a device',
    description: 'Administrators only: nothing says who uploaded a photo.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Device ID' })
  @ApiParam({ name: 'photoId', type: 'string', description: 'Photo UUID' })
  @ApiResponse({ status: 200, description: 'Photo deleted.' })
  @ApiResponse({ status: 404, description: 'Photo not found.' })
  async deleteDevicePhoto(
    @Param('id') id: number,
    @Param('photoId') photoId: string,
  ) {
    this.logger.log(
      `deleteDevicePhoto called for device ${id}, photo ${photoId}`,
    );
    try {
      const { key } = await firstValueFrom(
        this.devicesService.send({ cmd: 'delete_device_photo' }, { photoId }),
      );

      await this.storageService.deleteFile(key);

      return { success: true };
    } catch (error) {
      this.logger.error(
        'deleteDevicePhoto error: ' + error.message,
        error.stack,
      );
      throw new HttpException(
        error.message || 'Failed to delete photo',
        error.message?.includes('not found')
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
