import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FastPlanEcoController } from './fast-plan-eco.controller';
import { FastPlanEcoService } from './fast-plan-eco.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot(), HttpModule],
  controllers: [FastPlanEcoController],
  providers: [FastPlanEcoService],
  exports: [FastPlanEcoService],
})
export class FastPlanEcoModule {}
