// src/roles/roles.module.ts
import { Module } from '@nestjs/common';
import { RoleCacheService } from './role-cache.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'USER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const host = configService.get<string>('USER_SERVICE_HOST');
          const port = configService.get<number>('USER_SERVICE_PORT');

          console.log(
            `auth module - USER_SERVICE Host: ${host}, Port: ${port}`,
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
  providers: [RoleCacheService],
  exports: [RoleCacheService],
})
export class RolesModule {}
