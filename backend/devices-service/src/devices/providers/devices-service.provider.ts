import { Provider } from '@nestjs/common';
import { DevicesService } from '../services/devices.service';

export const DevicesServiceProvider: Provider = {
  provide: 'IDevicesService',
  useClass: DevicesService,
};
