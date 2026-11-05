import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorialSubscription } from './tutorial-subscription.entity';
import { TutorialSubscriptionService } from './tutorial-subscription.service';
import { TutorialSubscriptionController } from './tutorial-subscription.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TutorialSubscription])],
  providers: [TutorialSubscriptionService],
  controllers: [TutorialSubscriptionController],
  exports: [TutorialSubscriptionService, TypeOrmModule],
})
export class TutorialSubscriptionModule {}
