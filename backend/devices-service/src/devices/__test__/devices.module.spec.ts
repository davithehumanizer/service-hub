import { Test, TestingModule } from '@nestjs/testing';
import { DevicesModule } from '../devices.module';
import { DevicesController } from '../devices.controller';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../../entity/device.entity';
import { DeviceTechnicalProperty } from '../../entity/device-technical-property.entity';
import { DeviceCategory } from '../../entity/device-category.entity';
import { DeviceInformationalProperty } from '../../entity/device-informational-property.entity';
import { DevicePhoto } from '../../entity/device-photo.entity';

describe('DevicesModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forFeature([
          Device,
          DeviceTechnicalProperty,
          DeviceInformationalProperty,
          DeviceCategory,
          DevicePhoto,
        ]),
        DevicesModule,
      ],
    })
      .overrideProvider(getRepositoryToken(Device))
      .useValue({})
      .overrideProvider(getRepositoryToken(DeviceTechnicalProperty))
      .useValue({})
      .overrideProvider(getRepositoryToken(DeviceInformationalProperty))
      .useValue({})
      .overrideProvider(getRepositoryToken(DeviceCategory))
      .useValue({})
      .overrideProvider(getRepositoryToken(DevicePhoto))
      .useValue({})
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
    expect(module.get(DevicesController)).toBeDefined();
    expect(module.get('IDevicesService')).toBeDefined();
  });
});
