import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepairerProfile } from './repairer-profile.entity';
import { RepairerProfileService } from './repairer-profile.service';
import { RepairerProfileController } from './repairer-profile.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RepairerProfile])],
  providers: [RepairerProfileService],
  controllers: [RepairerProfileController],
  exports: [RepairerProfileService, TypeOrmModule],
})
export class RepairerProfileModule {}
