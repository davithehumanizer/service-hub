import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SparePartsModule } from '../spare-parts/spare-parts.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    ConfigModule,
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        node:
          configService.get<string>('ELASTICSEARCH_URL') ||
          'http://localhost:9200',
      }),
      inject: [ConfigService],
    }),
    SparePartsModule,
    DevicesModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
