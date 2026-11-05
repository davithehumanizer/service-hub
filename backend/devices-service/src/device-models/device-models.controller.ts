import { Controller } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { ModelsService, NewModel } from './models.service';
import { ModelSort } from '../search/model-search.service';

/** Device models, over TCP, for the gateway's /api/v2/device-models. */
@Controller()
export class DeviceModelsController {
  constructor(private readonly models: ModelsService) {}

  @MessagePattern({ cmd: 'get_device_models' })
  async searchModels({
    query = {},
    locale,
  }: {
    query?: {
      page?: number;
      limit?: number;
      search?: string;
      strict?: boolean;
      /** Canonical names, which may contain a comma. */
      categories?: string[];
      sortBy?: ModelSort;
    };
    locale?: string;
  }) {
    try {
      return await this.models.searchModels({ ...query, locale });
    } catch (error) {
      throw new RpcException(error.message || 'Failed to search device models');
    }
  }

  @MessagePattern({ cmd: 'get_device_model' })
  async getModel({
    id,
    page,
    limit,
    locale,
    search,
    parts,
    variant,
  }: {
    id: number;
    page?: number;
    limit?: number;
    locale?: string;
    search?: string;
    parts?: Record<string, string>;
    variant?: number;
  }) {
    try {
      return await this.models.getModel(id, {
        page,
        limit,
        locale,
        search,
        parts,
        variant,
      });
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get device model');
    }
  }

  @MessagePattern({ cmd: 'get_device_models_by_ids' })
  async getModels({ ids, locale }: { ids: number[]; locale?: string }) {
    try {
      return await this.models.getModels(ids, locale);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get device models');
    }
  }

  @MessagePattern({ cmd: 'get_device_model_variants_by_ids' })
  async getVariants({ ids }: { ids: number[] }) {
    try {
      return await this.models.getVariants(ids);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get variants');
    }
  }

  @MessagePattern({ cmd: 'lookup_device_model' })
  async lookup({ code, locale }: { code: string; locale?: string }) {
    try {
      return await this.models.lookup(code, locale);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to look up device model');
    }
  }

  @MessagePattern({ cmd: 'create_device_model' })
  async createModel({ model, locale }: { model: NewModel; locale?: string }) {
    try {
      return await this.models.createModel(model, locale);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to create device model');
    }
  }

  @MessagePattern({ cmd: 'add_device_model_photos' })
  async addModelPhotos({
    modelId,
    photoUrls,
  }: {
    modelId: number;
    photoUrls: { url: string; key: string }[];
  }) {
    try {
      return await this.models.addModelPhotos(modelId, photoUrls);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to add model photos');
    }
  }

  @MessagePattern({ cmd: 'delete_device_model_photo' })
  async deleteModelPhoto({
    modelId,
    photoId,
  }: {
    modelId: number;
    photoId: string;
  }) {
    try {
      return await this.models.deleteModelPhoto(modelId, photoId);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to delete model photo');
    }
  }
}
