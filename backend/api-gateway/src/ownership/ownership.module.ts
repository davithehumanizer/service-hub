import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OwnershipController } from './ownership.controller';
import { PersonalDevicesController } from './personal-devices.controller';
import { DevicesModule } from 'src/devices/devices.module';
import { RolesModule } from 'src/roles/roles.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    RolesModule,
    AuthModule,
    DevicesModule,
    ClientsModule.registerAsync([
      {
        name: 'OWNERSHIP_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const host = configService.get<string>('OWNERSHIP_SERVICE_HOST');
          const port = configService.get<number>('OWNERSHIP_SERVICE_PORT');

          console.log(
            `ownership module - OWNERSHIP_SERVICE Host: ${host}, Port: ${port}`,
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
  controllers: [OwnershipController, PersonalDevicesController],
  exports: [ClientsModule],
})
export class OwnershipModule {}
