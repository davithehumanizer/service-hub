import { Module } from '@nestjs/common';
import { RolesModule } from 'src/roles/roles.module';
import { AuthModule } from 'src/auth/auth.module';
import { DevicesModule } from 'src/devices/devices.module';
import { ContributionsController } from './contributions.controller';

@Module({
  imports: [RolesModule, AuthModule, DevicesModule],
  controllers: [ContributionsController],
})
export class ContributionsModule {}
