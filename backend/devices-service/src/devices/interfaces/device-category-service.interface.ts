import { DeviceCategory } from '../../entity/device-category.entity';

export interface IDeviceCategoryService {
  findAll(locale?: string): Promise<DeviceCategory[]>;
  findOne(id: number): Promise<DeviceCategory | null>;
  findByUrn(urn: string): Promise<DeviceCategory | null>;
  findByUnukey(unukey: string): Promise<DeviceCategory[]>;
  findByName(name: string): Promise<DeviceCategory | null>;
  create(name: string): Promise<DeviceCategory>;
  update(
    id: number,
    name: string,
    ifixitWikiid?: string | null,
  ): Promise<DeviceCategory>;
  remove(id: number): Promise<void>;
}
