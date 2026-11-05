import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TutorialSubscription } from './tutorial-subscription.entity';

export interface CreateTutorialSubscriptionInput {
  email: string;
  /** The device model the user waits a tutorial for. */
  modelId?: number;
  deviceId?: string;
  issueTypes?: string[];
  locale: string;
  userId?: number;
}

@Injectable()
export class TutorialSubscriptionService {
  constructor(
    @InjectRepository(TutorialSubscription)
    private readonly tutorialSubscriptionRepo: Repository<TutorialSubscription>,
  ) {}

  async create(
    data: CreateTutorialSubscriptionInput,
  ): Promise<TutorialSubscription> {
    const subscription = this.tutorialSubscriptionRepo.create(data);
    return this.tutorialSubscriptionRepo.save(subscription);
  }
}
