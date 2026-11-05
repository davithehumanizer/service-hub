import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UsersController } from './users.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RolesModule } from 'src/roles/roles.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    RolesModule,
    AuthModule,
    ClientsModule.registerAsync([
      {
        name: 'USER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const host = configService.get<string>('USER_SERVICE_HOST');
          const port = configService.get<number>('USER_SERVICE_PORT');

          console.log(
            `user module - USER_SERVICE Host: ${host}, Port: ${port}`,
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
  controllers: [UsersController],
  exports: [ClientsModule],
})
export class UsersModule {}
