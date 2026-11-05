import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { LogsController } from './common/logs.controller';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RepairersModule } from './repairers/repairers.module';
import { DevicesModule } from './devices/devices.module';
import { OwnershipModule } from './ownership/ownership.module';
import { RolesModule } from './roles/roles.module';
import { AppClsModule } from './common/cls.module';
import { FluentLoggerService } from './common/fluent-logger.service';
import { TraceIdInterceptor } from './common/traceid.interceptor';
import { ApiDocumentationService } from './common/api-documentation.service';
import { ExternalAdaptersModule } from './external-adapters/external-adapters.module';
import { FastPlanEcoModule } from './fast-plan-eco/fast-plan-eco.module';
import { SearchModule } from './search/search.module';
import { SparePartsModule } from './spare-parts/spare-parts.module';
import { SurveysModule } from './surveys/surveys.module';
import { IdentificationModule } from './identification/identification.module';
import { WellKnownModule } from './well-known/well-known.module';
import { StorageModule } from './storage/storage.module';
import { ApiCatalogGatewayModule } from './api-catalog/api-catalog.module';
import { IssueTagModule } from './issue-tag/issue-tag.module';
import { RepairMonitorModule } from './repair-monitor/repair-monitor.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    // Global ceiling only — deliberately generous so server-to-server clients
    // (the OAuth2 client_credentials integrations) are not disrupted. The
    // endpoints worth protecting carry their own tighter @Throttle().
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: Number(process.env.THROTTLE_GLOBAL_LIMIT ?? 300),
      },
    ]),
    AppClsModule,
    UsersModule,
    AuthModule,
    RolesModule,
    RepairersModule,
    DevicesModule,
    OwnershipModule,
    ExternalAdaptersModule,
    FastPlanEcoModule,
    SearchModule,
    SparePartsModule,
    SurveysModule,
    IdentificationModule,
    WellKnownModule,
    StorageModule,
    ApiCatalogGatewayModule,
    IssueTagModule,
    RepairMonitorModule,
    NotificationsModule,
  ],
  controllers: [AppController, LogsController],
  providers: [
    FluentLoggerService,
    TraceIdInterceptor,
    ApiDocumentationService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [FluentLoggerService],
})
export class AppModule {}
