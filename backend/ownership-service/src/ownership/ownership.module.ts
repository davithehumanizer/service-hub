import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ownership } from './ownership.entity';
import { OwnershipService } from './ownership.service';
import { OwnershipController } from './ownership.controller';
import { PersonalDevicesService } from './personal-devices.service';
import { PersonalDevicesController } from './personal-devices.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ownership])],
  providers: [OwnershipService, PersonalDevicesService],
  controllers: [OwnershipController, PersonalDevicesController],
  exports: [OwnershipService, TypeOrmModule],
})
export class OwnershipModule {}
