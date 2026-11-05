import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TutorialSubscriptionService } from '../tutorial-subscription.service';
import { TutorialSubscription } from '../tutorial-subscription.entity';

describe('TutorialSubscriptionService', () => {
  let service: TutorialSubscriptionService;
  let repo: Repository<TutorialSubscription>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorialSubscriptionService,
        {
          provide: getRepositoryToken(TutorialSubscription),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TutorialSubscriptionService>(
      TutorialSubscriptionService,
    );
    repo = module.get<Repository<TutorialSubscription>>(
      getRepositoryToken(TutorialSubscription),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a subscription with all fields', async () => {
      const input = {
        email: 'user@example.com',
        deviceId: 'device-uuid-123',
        issueTypes: ['screen_broken', 'battery'],
        locale: 'fr',
      };
      const created = { id: 'sub-1', ...input };

      jest.spyOn(repo, 'create').mockReturnValue(created as any);
      jest.spyOn(repo, 'save').mockResolvedValue(created as any);

      const result = await service.create(input);

      expect(repo.create).toHaveBeenCalledWith(input);
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('should create and save a subscription with only required fields', async () => {
      const input = { email: 'user@example.com', locale: 'en' };
      const created = { id: 'sub-2', ...input };

      jest.spyOn(repo, 'create').mockReturnValue(created as any);
      jest.spyOn(repo, 'save').mockResolvedValue(created as any);

      const result = await service.create(input);

      expect(repo.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(created);
    });

    it('should propagate errors from the repository', async () => {
      const input = { email: 'user@example.com', locale: 'en' };
      jest.spyOn(repo, 'create').mockReturnValue(input as any);
      jest.spyOn(repo, 'save').mockRejectedValue(new Error('db error'));

      await expect(service.create(input)).rejects.toThrow('db error');
    });
  });
});
