import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  TutorialSubscriptionService,
  CreateTutorialSubscriptionInput,
} from './tutorial-subscription.service';

@Controller()
export class TutorialSubscriptionController {
  constructor(
    private readonly tutorialSubscriptionService: TutorialSubscriptionService,
  ) {}

  @MessagePattern({ cmd: 'create_tutorial_subscription' })
  async create(@Payload() data: CreateTutorialSubscriptionInput) {
    return this.tutorialSubscriptionService.create(data);
  }
}
