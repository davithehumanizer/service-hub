import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OauthController } from './oauth.controller';
import { OauthService } from './oauth.service';
import { OauthClient } from './oauth.entity';
import { OauthAuthorizationCode } from './oauth-authorization-code.entity';
import { OauthRefreshToken } from './oauth-refresh-token.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OauthClient,
      OauthAuthorizationCode,
      OauthRefreshToken,
    ]),
    ClientsModule.registerAsync([
      {
        name: 'USER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const host = configService.get<string>('USER_SERVICE_HOST');
          const port = configService.get<number>('USER_SERVICE_PORT');

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
  controllers: [OauthController],
  providers: [OauthService],
})
export class OauthModule {}
