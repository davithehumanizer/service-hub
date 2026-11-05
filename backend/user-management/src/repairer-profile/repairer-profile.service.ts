import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RepairerProfile } from './repairer-profile.entity';

@Injectable()
export class RepairerProfileService {
  constructor(
    @InjectRepository(RepairerProfile)
    private readonly repairerProfileRepository: Repository<RepairerProfile>,
  ) {}

  async findByUserId(userId: number): Promise<RepairerProfile | null> {
    return this.repairerProfileRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  }

  async create(
    userId: number,
    data: Partial<RepairerProfile>,
  ): Promise<RepairerProfile> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      Object.assign(existing, data);
      return this.repairerProfileRepository.save(existing);
    }
    const profile = this.repairerProfileRepository.create({
      ...data,
      user: { id: userId } as any,
    });
    return this.repairerProfileRepository.save(profile);
  }

  async update(
    userId: number,
    data: Partial<RepairerProfile>,
  ): Promise<RepairerProfile> {
    const existing = await this.findByUserId(userId);
    if (!existing) {
      throw new NotFoundException(
        `Repairer profile for user ${userId} not found`,
      );
    }
    Object.assign(existing, data);
    return this.repairerProfileRepository.save(existing);
  }
}
