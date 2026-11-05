import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { RoleController } from './role.controller';
import { PermissionController } from './permission.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { OAuthJwtStrategy } from './strategies/oauth-jwt.strategy';
import { RolesModule } from 'src/roles/roles.module';
import { FlexibleAuthGuard } from './flexible-auth.guard';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { PermissionsGuard } from './permission.guard';

@Module({
  imports: [
    RolesModule,
    PassportModule,
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
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const host =
            configService.get<string>('AUTH_SERVICE_HOST') || 'localhost';
          const port = configService.get<number>('AUTH_SERVICE_PORT') || 3006;
          console.log(
            `auth module - AUTH_SERVICE Host: ${host}, Port: ${port}`,
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
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '3600s' },
    }),
  ],
  controllers: [AuthController, RoleController, PermissionController],
  providers: [
    JwtStrategy,
    OAuthJwtStrategy,
    FlexibleAuthGuard,
    PermissionsGuard,
    GoogleStrategy,
    FacebookStrategy,
  ],
  exports: [FlexibleAuthGuard, PermissionsGuard, ClientsModule],
})
export class AuthModule {}
