import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { IdentificationController } from './identification.controller';
import { IdentificationService } from './identification.service';
import { HandoffController } from './handoff.controller';
import { HandoffService } from './handoff.service';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [IdentificationController, HandoffController],
  providers: [IdentificationService, HandoffService],
})
export class IdentificationModule {}
