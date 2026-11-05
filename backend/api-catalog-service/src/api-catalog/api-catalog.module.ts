import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiCatalogController } from './api-catalog.controller';
import { ApiCatalogService } from './api-catalog.service';
import { ApiTool } from './entities/api-tool.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApiTool])],
  controllers: [ApiCatalogController],
  providers: [ApiCatalogService],
})
export class ApiCatalogModule {}
