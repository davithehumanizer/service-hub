import { Provider } from '@nestjs/common';
import { RepairersService } from '../services/repairers.service';

export const RepairersServiceProvider: Provider = {
  provide: 'IRepairersService',
  useClass: RepairersService,
};
