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
  Request,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { FlexibleAuthGuard } from 'src/auth/flexible-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { Permissions } from 'src/auth/permission.decorator';
import { DeviceModelResolver } from 'src/devices/device-model-resolver.service';
import {
  CreatePersonalDeviceDto,
  PersonalDeviceDto,
  UpdatePersonalDeviceDto,
} from './dto/personal-device.dto';

type Stored = Omit<PersonalDeviceDto, 'model' | 'variant'>;

const localeOf = (acceptLanguage?: string) =>
  (acceptLanguage || 'en').split(/[,;]/)[0].trim().slice(0, 2);

/**
 * The signed-in user's own devices: of a model, of one of its variants when
 * known; two identical ones are allowed, so a device is designated by its
 * own id. Each comes with its model, for "My devices".
 */
@ApiTags('Personal devices')
@Controller('personal-devices')
export class PersonalDevicesController {
  private readonly logger = new Logger(PersonalDevicesController.name);

  constructor(
    @Inject('OWNERSHIP_SERVICE') private readonly ownership: ClientProxy,
    private readonly resolver: DeviceModelResolver,
  ) {}

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('ownership.get_user_devices')
  @Version('2')
  @Get()
  @ApiOperation({
    summary: "List the signed-in user's devices",
    description:
      'Each with its model, and its variant when known, as the catalogue has them now; category names follow `Accept-Language`.',
  })
  @ApiResponse({ status: 200, type: [PersonalDeviceDto] })
  @ApiResponse({
    status: 403,
    description:
      'Not signed in (a guest, or an OAuth2 client acting for itself, has no devices), or without `ownership.get_user_devices`.',
  })
  async list(
    @Request() req: { user?: { id?: number; sub?: string } },
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<PersonalDeviceDto[]> {
    const devices = await this.call<Stored[]>('list_personal_devices', {
      userId: this.userOf(req),
    });
    return this.withModels(devices, acceptLanguage);
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('ownership.get_user_devices')
  @Version('2')
  @Get(':id')
  @ApiOperation({
    summary: 'Get one of the signed-in user’s devices',
    description:
      'With its model and variant. A device of another user answers 404, as one that does not exist.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Personal device ID' })
  @ApiResponse({ status: 200, type: PersonalDeviceDto })
  @ApiResponse({ status: 400, description: 'Not a personal device id.' })
  @ApiResponse({
    status: 403,
    description:
      'Not signed in (a guest, or an OAuth2 client acting for itself, has no devices), or without `ownership.get_user_devices`.',
  })
  @ApiResponse({ status: 404, description: 'No such device of this user.' })
  async get(
    @Request() req: { user?: { id?: number; sub?: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<PersonalDeviceDto> {
    const device = await this.call<Stored>('get_personal_device', {
      id,
      userId: this.userOf(req),
    });
    const [withModel] = await this.withModels([device], acceptLanguage);
    return withModel;
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('ownership.assign_device')
  @Version('2')
  @Post()
  @ApiOperation({
    summary: 'Add a device to the signed-in user’s devices',
    description:
      'A model, a variant of it, or both. A second device of a model the user already has is made only with `another`: two identical phones exist, a repeated click does not make one.',
  })
  @ApiBody({ type: CreatePersonalDeviceDto })
  @ApiResponse({ status: 201, type: PersonalDeviceDto })
  @ApiResponse({
    status: 400,
    description: 'No model nor variant, or a variant of another model.',
  })
  @ApiResponse({ status: 404, description: 'Unknown model or variant.' })
  @ApiResponse({
    status: 409,
    description: 'A device of this model is owned, and `another` was not sent.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Not signed in (a guest, or an OAuth2 client acting for itself, has no devices), or without `ownership.assign_device`.',
  })
  async create(
    @Request() req: { user?: { id?: number; sub?: string } },
    @Body() body: CreatePersonalDeviceDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<PersonalDeviceDto> {
    const userId = this.userOf(req);
    const { modelId, deviceId } = await this.resolver.resolve(body);
    const device = await this.call<Stored>('create_personal_device', {
      userId,
      device: { ...body, modelId, deviceId },
    });
    const [withModel] = await this.withModels([device], acceptLanguage);
    return withModel;
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('ownership.assign_device')
  @Version('2')
  @Patch(':id')
  @ApiOperation({
    summary: 'Change one of the signed-in user’s devices',
    description:
      'Only the fields sent change; `null` clears the nickname or the variant. A new model drops the variant of the former one; a variant sent must be of the model, the one sent or the device’s own.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Personal device ID' })
  @ApiBody({ type: UpdatePersonalDeviceDto })
  @ApiResponse({ status: 200, type: PersonalDeviceDto })
  @ApiResponse({
    status: 400,
    description: 'Not a personal device id, or a variant of another model.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Not signed in (a guest, or an OAuth2 client acting for itself, has no devices), or without `ownership.assign_device`.',
  })
  @ApiResponse({ status: 404, description: 'No such device of this user.' })
  async update(
    @Request() req: { user?: { id?: number; sub?: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePersonalDeviceDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<PersonalDeviceDto> {
    const userId = this.userOf(req);
    const changes: UpdatePersonalDeviceDto = { ...body };
    if (body.modelId != null || body.deviceId != null) {
      const current = await this.call<Stored>('get_personal_device', {
        id,
        userId,
      });
      if (body.deviceId != null) {
        // A variant of the model given, or of the device's own.
        Object.assign(
          changes,
          await this.resolver.resolve({
            modelId: body.modelId ?? current.modelId,
            deviceId: body.deviceId,
          }),
        );
      } else if (body.modelId !== current.modelId) {
        await this.resolver.resolve({ modelId: body.modelId });
        // The variant of the former model is not one of the new.
        if (body.deviceId === undefined) changes.deviceId = null;
      }
    }
    const device = await this.call<Stored>('update_personal_device', {
      id,
      userId,
      changes,
    });
    const [withModel] = await this.withModels([device], acceptLanguage);
    return withModel;
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('ownership.remove_device')
  @Version('2')
  @Delete(':id')
  @ApiOperation({
    summary: 'Remove one of the signed-in user’s devices',
    description:
      'Its repair journeys are kept: they stay among the user’s repairs.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Personal device ID' })
  @ApiResponse({ status: 200, description: 'Removed.' })
  @ApiResponse({ status: 400, description: 'Not a personal device id.' })
  @ApiResponse({
    status: 403,
    description:
      'Not signed in (a guest, or an OAuth2 client acting for itself, has no devices), or without `ownership.remove_device`.',
  })
  @ApiResponse({ status: 404, description: 'No such device of this user.' })
  async remove(
    @Request() req: { user?: { id?: number; sub?: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    return this.call('delete_personal_device', {
      id,
      userId: this.userOf(req),
    });
  }

  /**
   * The signed-in user: `sub` from OAuth2, `id` from the site's own tokens;
   * reading one alone would take every user of the other kind for a guest.
   * An OAuth2 client acting for itself owns no device.
   */
  private userOf(req: { user?: { id?: number; sub?: string } }): number {
    const id = Number(req.user?.sub ?? req.user?.id);
    if (!Number.isInteger(id)) {
      throw new HttpException(
        'Personal devices belong to a signed-in user',
        HttpStatus.FORBIDDEN,
      );
    }
    return id;
  }

  private async withModels(
    devices: Stored[],
    acceptLanguage?: string,
  ): Promise<PersonalDeviceDto[]> {
    const [models, variants] = await Promise.all([
      this.resolver.models(
        devices.map((d) => d.modelId).filter((id) => id != null),
        localeOf(acceptLanguage),
      ),
      this.resolver.variants(
        devices.map((d) => d.deviceId).filter((id) => id != null),
      ),
    ]);
    const byId = new Map(models.map((m) => [m.id, m]));
    const variantById = new Map(variants.map((v) => [v.device_id, v]));
    return devices.map((d) => ({
      ...d,
      model: byId.get(d.modelId) ?? null,
      variant: (d.deviceId != null && variantById.get(d.deviceId)) || null,
    }));
  }

  private async call<T>(cmd: string, payload: object): Promise<T> {
    try {
      return await firstValueFrom(this.ownership.send<T>({ cmd }, payload));
    } catch (error) {
      const message: string = error?.message || `${cmd} failed`;
      this.logger.error(`${cmd} failed: ${message}`);
      throw new HttpException(
        message,
        typeof error?.status === 'number'
          ? error.status
          : /not found/i.test(message)
            ? HttpStatus.NOT_FOUND
            : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
