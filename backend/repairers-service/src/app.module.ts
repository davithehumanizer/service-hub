import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { RepairersModule } from './repairers/repairers.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [RepairersModule, DatabaseModule, SearchModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
