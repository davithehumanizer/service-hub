import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RepairersController } from './repairers.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RolesModule } from 'src/roles/roles.module';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    RolesModule,
    AuthModule,
    // Who proposed a repairer, and telling them what was decided.
    UsersModule,
    ClientsModule.registerAsync([
      {
        name: 'REPAIRERS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const host = configService.get<string>('REPAIRERS_SERVICE_HOST');
          const port = configService.get<number>('REPAIRERS_SERVICE_PORT');

          console.log(
            `repairers module - REPAIRERS_SERVICE Host: ${host}, Port: ${port}`,
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
  controllers: [RepairersController],
  exports: [ClientsModule],
})
export class RepairersModule {}
