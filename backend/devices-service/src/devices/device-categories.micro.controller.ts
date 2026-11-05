import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { IDeviceCategoryService } from './interfaces/device-category-service.interface';

@Controller()
export class DeviceCategoriesMicroController {
  constructor(
    @Inject('IDeviceCategoryService')
    private readonly categoryService: IDeviceCategoryService,
  ) {}

  @MessagePattern({ cmd: 'get_device_categories' })
  async getCategories(payload: { locale?: string } = {}) {
    try {
      return await this.categoryService.findAll(payload.locale);
    } catch (error: any) {
      throw new RpcException(error?.message || 'Failed to get categories');
    }
  }

  @MessagePattern({ cmd: 'get_device_category' })
  async getCategory(payload: { id: number }) {
    try {
      return await this.categoryService.findOne(payload.id);
    } catch (error: any) {
      throw new RpcException(error?.message || 'Failed to get category');
    }
  }

  @MessagePattern({ cmd: 'get_device_category_by_urn' })
  async getCategoryByUrn(payload: { urn: string }) {
    try {
      const category = await this.categoryService.findByUrn(payload.urn);
      if (!category) {
        throw new RpcException(`Category with URN ${payload.urn} not found`);
      }
      return category;
    } catch (error: any) {
      throw new RpcException(error?.message || 'Failed to get category by URN');
    }
  }

  @MessagePattern({ cmd: 'get_device_category_by_unukey' })
  async getCategoryByUnukey(payload: { unukey: string }) {
    try {
      // Return array of categories (can be empty)
      return await this.categoryService.findByUnukey(payload.unukey);
    } catch (error: any) {
      throw new RpcException(
        error?.message || 'Failed to get category by UNUkey',
      );
    }
  }

  @MessagePattern({ cmd: 'get_device_category_by_name' })
  async getCategoryByName(payload: { name: string }) {
    try {
      return await this.categoryService.findByName(payload.name);
    } catch (error: any) {
      throw new RpcException(
        error?.message || 'Failed to get category by name',
      );
    }
  }

  @MessagePattern({ cmd: 'create_device_category' })
  async createCategory(payload: { name: string }) {
    try {
      return await this.categoryService.create(payload.name);
    } catch (error: any) {
      throw new RpcException(error?.message || 'Failed to create category');
    }
  }

  @MessagePattern({ cmd: 'update_device_category' })
  async updateCategory(payload: { id: number; name: string }) {
    try {
      return await this.categoryService.update(payload.id, payload.name);
    } catch (error: any) {
      throw new RpcException(error?.message || 'Failed to update category');
    }
  }

  @MessagePattern({ cmd: 'delete_device_category' })
  async deleteCategory(payload: { id: number }) {
    try {
      await this.categoryService.remove(payload.id);
      return null;
    } catch (error: any) {
      throw new RpcException(error?.message || 'Failed to delete category');
    }
  }
}
