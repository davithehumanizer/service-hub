import { DeviceCategoryService } from '../services/device-category.service';

export const DeviceCategoryServiceProvider = {
  provide: 'IDeviceCategoryService',
  useClass: DeviceCategoryService,
};
