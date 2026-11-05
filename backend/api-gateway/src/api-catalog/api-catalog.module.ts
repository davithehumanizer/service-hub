import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApiCatalogController } from './api-catalog.controller';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    RolesModule,
    ClientsModule.registerAsync([
      {
        name: 'API_CATALOG_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get('API_CATALOG_SERVICE_HOST') ||
              'api-catalog-service',
            port: configService.get('API_CATALOG_SERVICE_PORT') || 3011,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ApiCatalogController],
})
export class ApiCatalogGatewayModule {}
