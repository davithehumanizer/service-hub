import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RepairMonitorController } from './repair-monitor.controller';
import { RepairCategoryController } from './repair-category.controller';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { FluentLoggerService } from '../common/fluent-logger.service';
import { DevicesModule } from '../devices/devices.module';
import { OwnershipModule } from '../ownership/ownership.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    RolesModule,
    DevicesModule,
    OwnershipModule,
    ClientsModule.registerAsync([
      {
        name: 'REPAIR_MONITOR_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get('REPAIR_MONITOR_SERVICE_HOST') ||
              'repair-monitor-service',
            port: parseInt(
              configService.get('REPAIR_MONITOR_SERVICE_PORT') || '3013',
              10,
            ),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'DEVICES_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get('DEVICES_SERVICE_HOST') || 'devices-service',
            port: parseInt(
              configService.get('DEVICES_SERVICE_PORT') || '3003',
              10,
            ),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'REPAIRERS_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get('REPAIRERS_SERVICE_HOST') ||
              'repairers-service',
            port: parseInt(
              configService.get('REPAIRERS_SERVICE_PORT') || '3002',
              10,
            ),
          },
        }),
        inject: [ConfigService],
      },
      // Holds the repair-impact reference data, needed when a declaration
      // freezes its CO2e figure.
      {
        name: 'EXTERNAL_ADAPTERS_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get('EXTERNAL_ADAPTERS_SERVICE_HOST') ||
              'external-adapters-service',
            port: parseInt(
              configService.get('EXTERNAL_ADAPTERS_SERVICE_PORT') || '3008',
              10,
            ),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [RepairMonitorController, RepairCategoryController],
  providers: [FluentLoggerService],
})
export class RepairMonitorModule {}
