import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SurveysController } from './surveys.controller';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    RolesModule,
    ClientsModule.registerAsync([
      {
        name: 'SURVEYS_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get('SURVEYS_SERVICE_HOST') || 'surveys-service',
            port: configService.get('SURVEYS_SERVICE_PORT') || 3009,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [SurveysController],
})
export class SurveysModule {}
