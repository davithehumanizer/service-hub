import { Filter } from 'src/types/Filter';
import { Device } from '../../entity/device.entity';
import { DevicePhoto } from '../../entity/device-photo.entity';
import { Author, Editor } from '../../types/author';

export interface IDevicesService {
  findAll(locale?: string): Promise<Device[]>;
  findAllV2(options?: {
    page?: number;
    limit?: number;
    search?: string;
    categories?: string;
    sortBy?: string;
    withProperties?: boolean;
    bypassEs?: boolean;
    strict?: boolean;
    locale?: string;
  }): Promise<{
    data: Device[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    categoryFacets: Record<string, number>;
  }>;
  getFilters(locale?: string): Promise<Filter[]>;
  searchDevices(
    search: string,
    strict?: boolean,
    locale?: string,
  ): Promise<Device[]>;
  getById(id: number, locale?: string): Promise<Device>;
  listDevicesMinimal(): Promise<
    {
      device_id: number;
      urn: string;
      brand: string;
      model: string;
      categoryNames: string[];
    }[]
  >;
  getByUrn(urn: string, locale?: string): Promise<Device>;
  findBySourceId(sourceId: string): Promise<Device | null>;
  existsBySourceId(sourceId: string): Promise<{ device_id: number } | null>;
  getDevicesByIds(ids: number[], locale?: string): Promise<Device[]>;
  createDevice(
    payload: Partial<Device> & {
      technicalProperties?: { property_name: string; property_value: string }[];
    },
  ): Promise<Device>;
  updateDevice(id: number, payload: Partial<Device>): Promise<Device>;
  addDevicePhotos(
    deviceId: number,
    photoUrls: { url: string; key: string }[],
    author?: Author,
  ): Promise<DevicePhoto[]>;
  deleteDevicePhoto(
    photoId: string,
    editor?: Editor,
    deviceId?: number,
  ): Promise<{ key: string }>;
}
