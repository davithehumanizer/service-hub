import { Test, TestingModule } from '@nestjs/testing';
import { TutorialSubscriptionController } from '../tutorial-subscription.controller';
import { TutorialSubscriptionService } from '../tutorial-subscription.service';

describe('TutorialSubscriptionController', () => {
  let controller: TutorialSubscriptionController;

  const mockService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TutorialSubscriptionController],
      providers: [
        { provide: TutorialSubscriptionService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<TutorialSubscriptionController>(
      TutorialSubscriptionController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to TutorialSubscriptionService.create', async () => {
      const payload = {
        email: 'user@example.com',
        deviceId: 'device-uuid-123',
        issueTypes: ['screen_broken'],
        locale: 'fr',
      };
      const created = { id: 'sub-1', ...payload };
      mockService.create.mockResolvedValue(created);

      const result = await controller.create(payload);

      expect(mockService.create).toHaveBeenCalledWith(payload);
      expect(result).toEqual(created);
    });

    it('should propagate errors from the service', async () => {
      const payload = { email: 'user@example.com', locale: 'en' };
      mockService.create.mockRejectedValue(new Error('fail'));

      await expect(controller.create(payload)).rejects.toThrow('fail');
    });
  });
});
