import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserProfile } from '../user-profile/user-profile.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoleModule } from 'src/roles/roles.module';
import { RefreshTokenModule } from '../auth/refresh-token.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile]),
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATIONS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get<string>('NOTIFICATIONS_SERVICE_HOST') ||
              '0.0.0.0',
            port:
              configService.get<number>('NOTIFICATIONS_SERVICE_PORT') || 3004,
          },
        }),
      },
    ]),
    ConfigModule,
    RoleModule,
    RefreshTokenModule,
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService, TypeOrmModule],
})
export class UserModule {}
