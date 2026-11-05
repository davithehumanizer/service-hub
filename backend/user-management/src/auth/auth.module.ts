import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '../users/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RefreshTokenModule } from './refresh-token.module';
/*import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { JwtAuthGuard } from './jwt-auth.guard';*/

@Module({
  imports: [
    UserModule,
    PassportModule,
    ConfigModule,
    RefreshTokenModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '3600s' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    /*{ provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },*/
  ],
})
export class AuthModule {}
