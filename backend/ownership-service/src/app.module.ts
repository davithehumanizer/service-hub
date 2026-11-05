import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { OwnershipModule } from './ownership/ownership.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [OwnershipModule, DatabaseModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
