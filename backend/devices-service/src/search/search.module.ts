import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DeviceSearchService } from './device-search.service';
import { ModelSearchService } from './model-search.service';

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
  ],
  providers: [DeviceSearchService, ModelSearchService],
  exports: [DeviceSearchService, ModelSearchService],
})
export class SearchModule {}
