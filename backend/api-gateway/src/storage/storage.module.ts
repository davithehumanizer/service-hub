import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { S3StorageService } from './s3-storage.service';
import { LocalStorageService } from './local-storage.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    S3StorageService,
    LocalStorageService,
    {
      provide: StorageService,
      inject: [ConfigService, S3StorageService, LocalStorageService],
      useFactory: (
        configService: ConfigService,
        s3: S3StorageService,
        local: LocalStorageService,
      ): StorageService => {
        const provider = configService.get<string>('STORAGE_PROVIDER', 's3');
        return provider === 'local' ? local : s3;
      },
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
