import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ExternalAdaptersController } from './external-adapters.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    DevicesModule,
    ClientsModule.registerAsync([
      {
        name: 'EXTERNAL_ADAPTERS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const host = configService.get<string>(
            'EXTERNAL_ADAPTERS_SERVICE_HOST',
          );
          const port = configService.get<number>(
            'EXTERNAL_ADAPTERS_SERVICE_PORT',
          );

          console.log(
            `external-adapters module - EXTERNAL_ADAPTERS_SERVICE Host: ${host}, Port: ${port}`,
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
  controllers: [ExternalAdaptersController],
  exports: [ClientsModule],
})
export class ExternalAdaptersModule {}
