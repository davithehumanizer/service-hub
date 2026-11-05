import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    ConfigModule,
    DevicesModule,
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATIONS_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get('NOTIFICATIONS_SERVICE_HOST') ||
              'notifications-service',
            port: parseInt(
              configService.get('NOTIFICATIONS_SERVICE_PORT') || '3004',
              10,
            ),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
