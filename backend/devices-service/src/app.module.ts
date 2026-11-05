import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DevicesModule } from './devices/devices.module';
import { DatabaseModule } from './database/database.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [DevicesModule, DatabaseModule, SearchModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
