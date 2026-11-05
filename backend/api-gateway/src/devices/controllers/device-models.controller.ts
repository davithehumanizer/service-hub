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
  Patch,
  Post,
  Query,
  Req,
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
import { authorOf, editorOf } from 'src/auth/author';
import { holdsPermission } from 'src/auth/holds-permission';
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
  DeviceModelVariantInputDto,
  NewDeviceModelVariantDto,
} from '../dto/device-model-variant.dto';
import { SOURCE_PERMISSION } from '../dto/source-field';
import { UpdateDeviceModelDto } from '../dto/update-device-model.dto';
import {
  CreateDeviceModelResponseDto,
  DeviceModelDto,
  DeviceModelLookupDto,
  DeviceModelPhotoDto,
  DeviceModelVariantDto,
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
    @Req() req: any,
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
        viewer: editorOf(req),
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
  @ApiResponse({
    status: 400,
    description:
      "No usable brand or name, or a contributor's barcode not starting with 2.",
  })
  @ApiResponse({
    status: 403,
    description:
      'Not signed in, without the `device.create` permission, or naming a source without `device.source.set`.',
  })
  @ApiResponse({
    status: 409,
    description:
      'A contributor gave a barcode or a reference the catalogue already has.',
  })
  async createModel(
    @Body() model: CreateDeviceModelDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<CreateDeviceModelResponseDto> {
    this.mayNameSource(model.source, req);
    const result: CreateDeviceModelResponseDto = await this.call(
      'create_device_model',
      { model, locale: localeOf(acceptLanguage), author: authorOf(req) },
      'Failed to create device model',
    );
    if (!result.created) res.status(HttpStatus.OK);
    return result;
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.create')
  @Version('2')
  @Post(':id/variants')
  @ApiOperation({
    summary: 'Add a variant to a device model',
    description:
      'With its technical properties, from which its label is computed. A barcode or a reference is required, and neither may be in the catalogue already.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Model ID' })
  @ApiBody({ type: NewDeviceModelVariantDto })
  @ApiResponse({ status: 201, type: DeviceModelVariantDto })
  @ApiResponse({
    status: 400,
    description:
      "No barcode nor reference, or a contributor's barcode not starting with 2.",
  })
  @ApiResponse({
    status: 403,
    description:
      'Not signed in, without the `device.create` permission, or naming a source without `device.source.set`.',
  })
  @ApiResponse({ status: 404, description: 'Model not found.' })
  @ApiResponse({
    status: 409,
    description:
      'The barcode or the reference is in the catalogue already; `modelId` names its model.',
  })
  async addVariant(
    @Param('id', ParseIdPipe) id: number,
    @Body() variant: NewDeviceModelVariantDto,
    @Req() req: any,
  ): Promise<DeviceModelVariantDto> {
    this.mayNameSource(variant.source, req);
    return this.call(
      'add_device_model_variant',
      { modelId: id, variant, author: authorOf(req) },
      'Failed to add the variant',
    );
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.create')
  @Version('2')
  @Patch(':id')
  @ApiOperation({
    summary: 'Change the brand, the name or the categories of a device model',
    description:
      'By its author or an administrator. A name the catalogue has for another model is refused, with that model.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Model ID' })
  @ApiBody({ type: UpdateDeviceModelDto })
  @ApiResponse({ status: 200, type: DeviceModelDto })
  @ApiResponse({ status: 400, description: 'No usable brand or name.' })
  @ApiResponse({
    status: 403,
    description: 'Neither its author nor an administrator.',
  })
  @ApiResponse({ status: 404, description: 'Model not found.' })
  @ApiResponse({
    status: 409,
    description: 'Another model has this name; `modelId` names it.',
  })
  async updateModel(
    @Param('id', ParseIdPipe) id: number,
    @Body() changes: UpdateDeviceModelDto,
    @Req() req: any,
  ): Promise<DeviceModelDto> {
    return this.call(
      'update_device_model',
      { modelId: id, changes, editor: editorOf(req) },
      'Failed to update the model',
    );
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device.create')
  @Version('2')
  @Patch(':id/variants/:variantId')
  @ApiOperation({
    summary: 'Change the codes or the technical properties of a variant',
    description:
      'By its author or an administrator. Properties sent replace those it had, and its label follows.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Model ID' })
  @ApiParam({ name: 'variantId', type: 'number', description: 'Variant ID' })
  @ApiBody({ type: DeviceModelVariantInputDto })
  @ApiResponse({ status: 200, type: DeviceModelVariantDto })
  @ApiResponse({
    status: 400,
    description:
      "Neither barcode nor reference left, or a contributor's barcode not starting with 2.",
  })
  @ApiResponse({
    status: 403,
    description: 'Neither its author nor an administrator.',
  })
  @ApiResponse({ status: 404, description: 'No such variant of this model.' })
  @ApiResponse({
    status: 409,
    description:
      'The barcode or the reference is another entry of the catalogue; `modelId` names its model.',
  })
  async updateVariant(
    @Param('id', ParseIdPipe) id: number,
    @Param('variantId', ParseIdPipe) variantId: number,
    @Body() changes: DeviceModelVariantInputDto,
    @Req() req: any,
  ): Promise<DeviceModelVariantDto> {
    return this.call(
      'update_device_model_variant',
      { modelId: id, variantId, changes, editor: editorOf(req) },
      'Failed to update the variant',
    );
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
    @Req() req: any,
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
        { modelId: id, photoUrls, author: authorOf(req) },
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
  @Permissions('device.photos.upload')
  @Version('2')
  @Delete(':id/photos/:photoId')
  @ApiOperation({
    summary: 'Delete a photo of a device model',
    description: 'By whoever uploaded it, or an administrator.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Model ID' })
  @ApiParam({ name: 'photoId', type: 'string', description: 'Photo UUID' })
  @ApiResponse({ status: 200, description: 'Photo deleted.' })
  @ApiResponse({ status: 400, description: 'Not a model id or a photo UUID.' })
  @ApiResponse({
    status: 403,
    description: 'Neither its uploader nor an administrator.',
  })
  @ApiResponse({ status: 404, description: 'No such photo of this model.' })
  async deletePhoto(
    @Param('id', ParseIdPipe) id: number,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Req() req: any,
  ): Promise<{ success: true }> {
    const { key } = await this.call<{ key: string }>(
      'delete_device_model_photo',
      { modelId: id, photoId, editor: editorOf(req) },
      'Failed to delete photo',
    );
    await this.storageService.deleteFile(key);
    return { success: true };
  }

  /**
   * Sends to devices-service, answering its refusals with their HTTP status:
   * what was not found 404, an unusable model 400, anything else 500.
   */
  /** A source is named by a client allowed to, never by anyone who creates. */
  private mayNameSource(source: string | undefined, req: any) {
    if (source !== undefined && !holdsPermission(req, SOURCE_PERMISSION)) {
      throw new HttpException(
        `Naming a source needs the ${SOURCE_PERMISSION} permission`,
        HttpStatus.FORBIDDEN,
      );
    }
  }

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
        : /needs a|starts with 2/i.test(message)
          ? HttpStatus.BAD_REQUEST
          : /^only /i.test(message)
            ? HttpStatus.FORBIDDEN
            : /already/i.test(message)
              ? HttpStatus.CONFLICT
              : HttpStatus.INTERNAL_SERVER_ERROR;
      // A conflict names the model meant, for a link to it.
      const modelId = Number(/model (\d+)/i.exec(message)?.[1]);
      throw new HttpException(
        status === HttpStatus.CONFLICT && modelId
          ? { statusCode: status, message, modelId }
          : message,
        status,
      );
    }
  }
}
