import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { Permissions } from 'src/auth/permission.decorator';
import { FlexibleAuthGuard } from 'src/auth/flexible-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { StorageService } from 'src/storage/storage.service';
import { ParseIdPipe } from 'src/common/database-id';
import {
  extensionForMimeType,
  photosUploadOptions,
} from 'src/common/upload.constraints';
import {
  GetDeviceModelQueryDto,
  GetDeviceModelsQueryDto,
  LookupDeviceModelQueryDto,
} from '../dto/get-device-models-query.dto';
import { CreateDeviceModelDto } from '../dto/create-device-model.dto';
import {
  CreateDeviceModelResponseDto,
  DeviceModelLookupDto,
  DeviceModelPhotoDto,
  DeviceModelWithVariantsDto,
  GetDeviceModelsResponseDto,
} from '../dto/device-model.dto';

const localeOf = (acceptLanguage?: string) =>
  (acceptLanguage || 'en').split(/[,;]/)[0].trim().slice(0, 2);

/**
 * Device models: what a user picks, a catalogue entry being one of its
 * variants. Read for guests too (device.read), created by signed-in users
 * (device.create).
 */
@ApiTags('Device models')
@Controller('device-models')
export class DeviceModelsController {
  private readonly logger = new Logger(DeviceModelsController.name);

  constructor(
    @Inject('DEVICES_SERVICE') private readonly devicesService: ClientProxy,
    private readonly storageService: StorageService,
  ) {}

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.read')
  @Version('2')
  @Get()
  @ApiOperation({
    summary: 'Search device models',
    description:
      'One result per model, with its variant count, a page of models and the category facets.',
  })
  @ApiResponse({ status: 200, type: GetDeviceModelsResponseDto })
  @ApiResponse({ status: 400, description: 'A query parameter out of range.' })
  @ApiResponse({
    status: 403,
    description: 'An OAuth2 client without the `device.read` scope.',
  })
  async searchModels(
    @Query() query: GetDeviceModelsQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<GetDeviceModelsResponseDto> {
    return this.call(
      'get_device_models',
      { query, locale: localeOf(acceptLanguage) },
      'Failed to search device models',
    );
  }

  // Before `:id`, which would take "lookup" for an id.
  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.read')
  @Version('2')
  @Get('lookup')
  @ApiOperation({
    summary: 'Find a device model by barcode or reference',
    description:
      "The variant a barcode (under any of its GTIN forms) or a manufacturer's reference names, and its model.",
  })
  @ApiResponse({ status: 200, type: DeviceModelLookupDto })
  @ApiResponse({ status: 400, description: 'No `code`.' })
  @ApiResponse({
    status: 403,
    description: 'An OAuth2 client without the `device.read` scope.',
  })
  @ApiResponse({ status: 404, description: 'No model for this code.' })
  async lookup(
    @Query() { code }: LookupDeviceModelQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<DeviceModelLookupDto> {
    return this.call(
      'lookup_device_model',
      { code, locale: localeOf(acceptLanguage) },
      'Failed to look up device model',
    );
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.read')
  @Version('2')
  @Get(':id')
  @ApiOperation({
    summary: 'Get a device model and a page of its variants',
    description:
      'The variants come with the one the model is shown with first, refurbishers last.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Model ID' })
  @ApiResponse({ status: 200, type: DeviceModelWithVariantsDto })
  @ApiResponse({
    status: 400,
    description: 'Not a model id, or a query parameter out of range.',
  })
  @ApiResponse({
    status: 403,
    description: 'An OAuth2 client without the `device.read` scope.',
  })
  @ApiResponse({ status: 404, description: 'Model not found.' })
  async getModel(
    @Param('id', ParseIdPipe) id: number,
    @Query() { page, limit, search, parts, variant }: GetDeviceModelQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<DeviceModelWithVariantsDto> {
    return this.call(
      'get_device_model',
      {
        id,
        page,
        limit,
        search,
        // "storage:256 GB": the key up to the first colon, the value after.
        parts: parts?.length
          ? Object.fromEntries(
              parts
                .filter((part) => part.includes(':'))
                .map((part) => [
                  part.slice(0, part.indexOf(':')),
                  part.slice(part.indexOf(':') + 1),
                ]),
            )
          : undefined,
        variant,
        locale: localeOf(acceptLanguage),
      },
      'Failed to get device model',
    );
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.create')
  @Version('2')
  @Post()
  @ApiOperation({
    summary: 'Create a device model by hand',
    description:
      'With a first variant when a barcode or a reference is given. Nothing is duplicated: a known barcode, reference or name answers with the existing model, 200 instead of 201, `created: false`.',
  })
  @ApiBody({ type: CreateDeviceModelDto })
  @ApiResponse({
    status: 201,
    description: 'Model created.',
    type: CreateDeviceModelResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'The model already existed.',
    type: CreateDeviceModelResponseDto,
  })
  @ApiResponse({ status: 400, description: 'No usable brand or name.' })
  @ApiResponse({
    status: 403,
    description: 'Not signed in, or without the `device.create` permission.',
  })
  async createModel(
    @Body() model: CreateDeviceModelDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<CreateDeviceModelResponseDto> {
    const result: CreateDeviceModelResponseDto = await this.call(
      'create_device_model',
      { model, locale: localeOf(acceptLanguage) },
      'Failed to create device model',
    );
    if (!result.created) res.status(HttpStatus.OK);
    return result;
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.photos.upload')
  @Version('2')
  @Post(':id/photos')
  @UseInterceptors(FilesInterceptor('photos', 10, photosUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload photos of a device model',
    description: 'Shown when no variant of the model has a picture of its own.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Model ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photos: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiResponse({ status: 201, type: [DeviceModelPhotoDto] })
  @ApiResponse({
    status: 400,
    description:
      'Not a model id, no file, or one that is not a JPEG, PNG or WebP image.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Not signed in, or without the `device.photos.upload` permission.',
  })
  @ApiResponse({ status: 413, description: 'A file over 10 MB.' })
  @ApiResponse({ status: 404, description: 'Model not found.' })
  async uploadPhotos(
    @Param('id', ParseIdPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<DeviceModelPhotoDto[]> {
    if (!files || files.length === 0) {
      throw new HttpException('No files uploaded', HttpStatus.BAD_REQUEST);
    }
    const uploads = await Promise.allSettled(
      files.map((file) =>
        this.storageService.uploadFile(file.buffer, {
          folder: `device-models/${id}`,
          filename: `${randomUUID()}${extensionForMimeType(file.mimetype)}`,
          mimeType: file.mimetype,
        }),
      ),
    );
    const photoUrls = uploads.flatMap((u) =>
      u.status === 'fulfilled' ? [u.value] : [],
    );
    try {
      const failed = uploads.find((u) => u.status === 'rejected');
      if (failed) throw failed.reason;
      return await this.call(
        'add_device_model_photos',
        { modelId: id, photoUrls },
        'Failed to upload photos',
      );
    } catch (error) {
      // Not stored by the service: nothing will ever point to the files. A
      // file that cannot be removed leaves the refusal as it was.
      await Promise.allSettled(
        photoUrls.map((p) => this.storageService.deleteFile(p.key)),
      );
      throw error;
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.photos.admin')
  @Version('2')
  @Delete(':id/photos/:photoId')
  @ApiOperation({
    summary: 'Delete a photo of a device model',
    description: 'Administrators only: nothing says who uploaded a photo.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Model ID' })
  @ApiParam({ name: 'photoId', type: 'string', description: 'Photo UUID' })
  @ApiResponse({ status: 200, description: 'Photo deleted.' })
  @ApiResponse({ status: 400, description: 'Not a model id or a photo UUID.' })
  @ApiResponse({
    status: 403,
    description: 'Not an administrator (`device.photos.admin`).',
  })
  @ApiResponse({ status: 404, description: 'No such photo of this model.' })
  async deletePhoto(
    @Param('id', ParseIdPipe) id: number,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<{ success: true }> {
    const { key } = await this.call<{ key: string }>(
      'delete_device_model_photo',
      { modelId: id, photoId },
      'Failed to delete photo',
    );
    await this.storageService.deleteFile(key);
    return { success: true };
  }

  /**
   * Sends to devices-service, answering its refusals with their HTTP status:
   * what was not found 404, an unusable model 400, anything else 500.
   */
  private async call<T>(cmd: string, payload: object, fallback: string) {
    try {
      return await firstValueFrom(
        this.devicesService.send<T>({ cmd }, payload),
      );
    } catch (error) {
      const message: string = error?.message || fallback;
      this.logger.error(`${cmd} failed: ${message}`);
      const status = /not found|no device model/i.test(message)
        ? HttpStatus.NOT_FOUND
        : /needs a brand/i.test(message)
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(message, status);
    }
  }
}
