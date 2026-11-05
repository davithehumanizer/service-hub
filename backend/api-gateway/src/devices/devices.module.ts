import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DevicesController } from './controllers/devices.controller';
import { DeviceCategoryController } from './controllers/device-category.controller';
import { DeviceModelsController } from './controllers/device-models.controller';
import { DeviceModelResolver } from './device-model-resolver.service';
import { RolesModule } from 'src/roles/roles.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    RolesModule,
    AuthModule,
    ClientsModule.registerAsync([
      {
        name: 'DEVICES_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const host = configService.get<string>('DEVICES_SERVICE_HOST');
          const port = configService.get<number>('DEVICES_SERVICE_PORT');

          console.log(
            `devices module - DEVICES_SERVICE Host: ${host}, Port: ${port}`,
          );

          return {
            transport: Transport.TCP,
            options: {
              host,
              port,
            },
          };
        },
      },
    ]),
  ],
  controllers: [
    DevicesController,
    DeviceCategoryController,
    DeviceModelsController,
  ],
  providers: [DeviceModelResolver],
  exports: [ClientsModule, DeviceModelResolver],
})
export class DevicesModule {}
