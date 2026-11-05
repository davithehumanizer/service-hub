import { Controller } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import {
  ModelChanges,
  ModelsService,
  NewModel,
  NewVariant,
} from './models.service';
import { ModelSort } from '../search/model-search.service';
import { Author, Editor } from '../types/author';

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
    viewer,
  }: {
    id: number;
    page?: number;
    limit?: number;
    locale?: string;
    search?: string;
    parts?: Record<string, string>;
    variant?: number;
    viewer?: Editor;
  }) {
    try {
      return await this.models.getModel(id, {
        page,
        limit,
        locale,
        search,
        parts,
        variant,
        viewer,
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
  async createModel({
    model,
    locale,
    author,
  }: {
    model: NewModel;
    locale?: string;
    author?: Author;
  }) {
    try {
      return await this.models.createModel(model, locale, author);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to create device model');
    }
  }

  @MessagePattern({ cmd: 'add_device_model_photos' })
  async addModelPhotos({
    modelId,
    photoUrls,
    author,
  }: {
    modelId: number;
    photoUrls: { url: string; key: string }[];
    author?: Author;
  }) {
    try {
      return await this.models.addModelPhotos(modelId, photoUrls, author);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to add model photos');
    }
  }

  @MessagePattern({ cmd: 'delete_device_model_photo' })
  async deleteModelPhoto({
    modelId,
    photoId,
    editor,
  }: {
    modelId: number;
    photoId: string;
    editor?: Editor;
  }) {
    try {
      return await this.models.deleteModelPhoto(modelId, photoId, editor);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to delete model photo');
    }
  }

  @MessagePattern({ cmd: 'add_device_model_variant' })
  async addVariant({
    modelId,
    variant,
    author,
  }: {
    modelId: number;
    variant: NewVariant;
    author?: Author;
  }) {
    try {
      return await this.models.addVariant(modelId, variant, author);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to add the variant');
    }
  }

  @MessagePattern({ cmd: 'update_device_model' })
  async updateModel({
    modelId,
    changes,
    editor,
  }: {
    modelId: number;
    changes: ModelChanges;
    editor: Editor;
  }) {
    try {
      return await this.models.updateModel(modelId, changes, editor);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to update the model');
    }
  }

  @MessagePattern({ cmd: 'update_device_model_variant' })
  async updateVariant({
    modelId,
    variantId,
    changes,
    editor,
  }: {
    modelId: number;
    variantId: number;
    changes: NewVariant;
    editor: Editor;
  }) {
    try {
      return await this.models.updateVariant(
        modelId,
        variantId,
        changes,
        editor,
      );
    } catch (error) {
      throw new RpcException(error.message || 'Failed to update the variant');
    }
  }
}
