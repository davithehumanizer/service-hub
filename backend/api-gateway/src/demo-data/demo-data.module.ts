import { Module } from '@nestjs/common';
import { RolesModule } from 'src/roles/roles.module';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { DevicesModule } from 'src/devices/devices.module';
import { RepairersModule } from 'src/repairers/repairers.module';
import { DemoDataController } from './demo-data.controller';

/** The purge of demonstration data: it calls the three services it empties. */
@Module({
  imports: [RolesModule, AuthModule, UsersModule, DevicesModule, RepairersModule],
  controllers: [DemoDataController],
})
export class DemoDataModule {}
