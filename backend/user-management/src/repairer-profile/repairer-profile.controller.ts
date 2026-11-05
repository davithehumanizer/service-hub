import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { RepairerProfileService } from './repairer-profile.service';
import { RepairerProfile } from './repairer-profile.entity';

@Controller()
export class RepairerProfileController {
  constructor(
    private readonly repairerProfileService: RepairerProfileService,
  ) {}

  @MessagePattern({ cmd: 'get_repairer_profile' })
  async getRepairerProfile(@Payload() data: { userId: number }) {
    try {
      return await this.repairerProfileService.findByUserId(data.userId);
    } catch (error) {
      throw new RpcException(error.message || 'Failed to get repairer profile');
    }
  }

  @MessagePattern({ cmd: 'create_repairer_profile' })
  async createRepairerProfile(
    @Payload() data: { userId: number; profile: Partial<RepairerProfile> },
  ) {
    try {
      return await this.repairerProfileService.create(
        data.userId,
        data.profile,
      );
    } catch (error) {
      throw new RpcException(
        error.message || 'Failed to create repairer profile',
      );
    }
  }

  @MessagePattern({ cmd: 'update_repairer_profile' })
  async updateRepairerProfile(
    @Payload() data: { userId: number; profile: Partial<RepairerProfile> },
  ) {
    try {
      return await this.repairerProfileService.update(
        data.userId,
        data.profile,
      );
    } catch (error) {
      throw new RpcException(
        error.message || 'Failed to update repairer profile',
      );
    }
  }
}
