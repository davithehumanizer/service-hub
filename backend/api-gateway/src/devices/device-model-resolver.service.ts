import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { DeviceModelDto, DeviceModelVariantDto } from './dto/device-model.dto';

/**
 * The model a request names, for what refers to one in other services:
 * personal devices, journeys, subscriptions. A variant names its model, so
 * a client may send either; a model sent with a variant must be that
 * variant's.
 */
@Injectable()
export class DeviceModelResolver {
  constructor(
    @Inject('DEVICES_SERVICE') private readonly devices: ClientProxy,
  ) {}

  async resolve(given: {
    modelId?: number | null;
    deviceId?: number | null;
  }): Promise<{ modelId: number; deviceId: number | null }> {
    const { modelId, deviceId } = given;
    if (deviceId != null) {
      const variant = await this.send<{ model_id: number | null }>(
        'get_device_by_id',
        { id: deviceId },
      );
      const ofVariant = variant.model_id;
      if (modelId != null && ofVariant != null && ofVariant !== modelId) {
        throw new HttpException(
          `Device ${deviceId} is not a variant of model ${modelId}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (ofVariant != null) return { modelId: ofVariant, deviceId };
      if (modelId == null) {
        throw new HttpException(
          `Device ${deviceId} has no model yet`,
          HttpStatus.BAD_REQUEST,
        );
      }
      return { modelId: await this.existing(modelId), deviceId };
    }
    if (modelId != null) {
      return { modelId: await this.existing(modelId), deviceId: null };
    }
    throw new HttpException(
      'A device model or a variant is needed',
      HttpStatus.BAD_REQUEST,
    );
  }

  private async existing(modelId: number): Promise<number> {
    const [model] = await this.models([modelId]);
    if (!model) {
      throw new HttpException(
        `Device model ${modelId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return modelId;
  }

  /** The models with these ids that exist, in this order. */
  models(ids: number[], locale?: string): Promise<DeviceModelDto[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.send('get_device_models_by_ids', { ids, locale });
  }

  /** The variants with these ids that exist. */
  variants(ids: number[]): Promise<DeviceModelVariantDto[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.send('get_device_model_variants_by_ids', { ids });
  }

  private async send<T>(cmd: string, payload: object): Promise<T> {
    try {
      return await firstValueFrom(this.devices.send<T>({ cmd }, payload));
    } catch (error) {
      const message: string = error?.message || `${cmd} failed`;
      throw new HttpException(
        message,
        /not found/i.test(message)
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
