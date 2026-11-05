/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { IDevicesService } from './interfaces/devices-service.interface';
import { Author, Editor } from '../types/author';

@Controller('devices')
export class DevicesController {
  constructor(
    @Inject('IDevicesService')
    private readonly devicesService: IDevicesService,
  ) {}

  @MessagePattern({ cmd: 'get_devices' })
  async getAllDevices({ locale }: { locale?: string } = {}) {
    try {
      console.log('getAllDevices called');
      return await this.devicesService.findAll(locale);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get devices');
    }
  }

  @MessagePattern({ cmd: 'get_devices_v2' })
  async getAllDevicesV2({ query, locale }: { query: any; locale?: string }) {
    try {
      console.log('getAllDevicesV2 called with query:', query);
      const {
        page,
        limit,
        search,
        withProperties,
        strict,
        categories,
        sortBy,
      } = query || {};
      return await this.devicesService.findAllV2({
        page,
        limit,
        search,
        categories,
        sortBy,
        withProperties,
        strict,
        locale,
      });
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get devices');
    }
  }

  @MessagePattern({ cmd: 'get_filters' })
  getFilters({ locale }: { locale?: string } = {}) {
    try {
      console.log('getFilters called');
      return this.devicesService.getFilters(locale);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get devices filters');
    }
  }

  @MessagePattern({ cmd: 'search_devices' })
  async searchDevices({
    query,
    strict,
    locale,
  }: {
    query: string;
    strict?: boolean;
    locale?: string;
  }) {
    try {
      console.log(
        'searchDevices called with query:',
        query,
        '| strict:',
        strict,
      );
      return await this.devicesService.searchDevices(query, strict, locale);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to search devices');
    }
  }

  @MessagePattern({ cmd: 'get_device_by_id' })
  async getById({ id, locale }: { id: number; locale?: string }) {
    try {
      console.log('getById called with id:', id);
      return await this.devicesService.getById(id, locale);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get device');
    }
  }

  @MessagePattern({ cmd: 'list_devices_minimal' })
  async listDevicesMinimal() {
    try {
      console.log('listDevicesMinimal called');
      return await this.devicesService.listDevicesMinimal();
    } catch (error) {
      throw new RpcException(error.message || 'Failed to list devices minimal');
    }
  }

  @MessagePattern({ cmd: 'get_device_by_urn' })
  async getByUrn({ urn, locale }: { urn: string; locale?: string }) {
    try {
      console.log('getByUrn called with urn:', urn);
      return await this.devicesService.getByUrn(urn, locale);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get device by URN');
    }
  }

  @MessagePattern({ cmd: 'get_device_by_source_id' })
  async getBySourceId({ sourceId }: { sourceId: string }) {
    try {
      console.log('getBySourceId called with sourceId:', sourceId);
      return await this.devicesService.findBySourceId(sourceId);
    } catch (error) {
      throw new RpcException(
        error.message || 'Failed to get device by source ID',
      );
    }
  }

  @MessagePattern({ cmd: 'get_devices_by_ids' })
  async getDevicesByIds({ ids, locale }: { ids: number[]; locale?: string }) {
    try {
      console.log('getDevicesByIds called with ids:', ids);
      return await this.devicesService.getDevicesByIds(ids, locale);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get devices');
    }
  }

  @MessagePattern({ cmd: 'create_device' })
  async createDevice(payload: any) {
    try {
      console.log('createDevice called with data:', payload);
      return await this.devicesService.createDevice(payload);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to create device');
    }
  }

  @MessagePattern({ cmd: 'update_device' })
  async updateDevice({ id, payload }: { id: number; payload: any }) {
    try {
      console.log('updateDevice called with id:', id, 'data:', payload);
      return await this.devicesService.updateDevice(id, payload);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to update device');
    }
  }

  @MessagePattern({ cmd: 'add_device_photos' })
  async addDevicePhotos({
    deviceId,
    photoUrls,
    author,
  }: {
    deviceId: number;
    photoUrls: { url: string; key: string }[];
    author?: Author;
  }) {
    try {
      console.log('addDevicePhotos called for device:', deviceId);
      return await this.devicesService.addDevicePhotos(
        deviceId,
        photoUrls,
        author,
      );
    } catch (error) {
      throw new RpcException(error.message || 'Failed to add device photos');
    }
  }

  @MessagePattern({ cmd: 'delete_device_photo' })
  async deleteDevicePhoto({
    photoId,
    editor,
    deviceId,
  }: {
    photoId: string;
    editor?: Editor;
    deviceId?: number;
  }) {
    try {
      console.log('deleteDevicePhoto called for photo:', photoId);
      return await this.devicesService.deleteDevicePhoto(
        photoId,
        editor,
        deviceId,
      );
    } catch (error) {
      throw new RpcException(error.message || 'Failed to delete device photo');
    }
  }
}
