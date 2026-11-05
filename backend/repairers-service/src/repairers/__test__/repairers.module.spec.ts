import { Test, TestingModule } from '@nestjs/testing';
import { RepairersModule } from '../repairers.module';
import { RepairersController } from '../repairers.controller';
import { RepairerImporterService } from '../services/repairerImporter.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repairer } from '../repairer.entity';
import { RepairerDevice } from '../repairer-device.entity';
import { RepairerReport } from '../repairer-report.entity';
import { IRepairersService } from '../interfaces/repairers-service.interface';

describe('RepairersModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [RepairersModule],
    })
      .overrideProvider(getRepositoryToken(Repairer))
      .useValue({})
      .overrideProvider(getRepositoryToken(RepairerDevice))
      .useValue({})
      // Registered by RepairersModule alongside the other two; without an
      // override Nest tries to build the real repository and needs a DataSource.
      .overrideProvider(getRepositoryToken(RepairerReport))
      .useValue({})
      .overrideProvider('IRepairersService')
      .useValue({})
      .overrideProvider(RepairerImporterService)
      .useValue({})
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should have the controller defined', () => {
    const controller = module.get<RepairersController>(RepairersController);
    expect(controller).toBeDefined();
  });

  it('should have the service provider defined', () => {
    const service = module.get<IRepairersService>('IRepairersService');
    expect(service).toBeDefined();
  });

  it('should have the importer service defined', () => {
    const importer = module.get<RepairerImporterService>(
      RepairerImporterService,
    );
    expect(importer).toBeDefined();
  });
});
