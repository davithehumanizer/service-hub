import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RepairerSearchService } from './repairer-search.service';

@Module({
  imports: [
    ConfigModule,
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        node: configService.get<string>('ELASTICSEARCH_URL') || 'http://localhost:9200',
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [RepairerSearchService],
  exports: [RepairerSearchService],
})
export class SearchModule {}
