import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { IssueTagController } from './issue-tag.controller';
import { FluentLoggerService } from '../common/fluent-logger.service';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [IssueTagController],
  providers: [FluentLoggerService],
})
export class IssueTagModule {}
