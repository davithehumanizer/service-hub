import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { RoleModule } from './roles/roles.module';
import { PermissionModule } from './permissions/permmissions.module';
import { RecaptchaModule } from './recaptcha/recaptcha.module';
import { RepairerProfileModule } from './repairer-profile/repairer-profile.module';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    RoleModule,
    PermissionModule,
    UserModule,
    RepairerProfileModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RecaptchaModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
