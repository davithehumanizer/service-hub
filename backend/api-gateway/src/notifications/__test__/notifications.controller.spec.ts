import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { NotificationsController } from '../notifications.controller';
import { DeviceModelResolver } from '../../devices/device-model-resolver.service';

describe('NotificationsController (api-gateway)', () => {
  let controller: NotificationsController;

  const mockNotificationsProxy = { send: jest.fn() };
  const mockResolver = { resolve: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: 'NOTIFICATIONS_SERVICE', useValue: mockNotificationsProxy },
        { provide: DeviceModelResolver, useValue: mockResolver },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTutorialSubscription', () => {
    const dto = {
      email: 'user@example.com',
      deviceId: 'device-uuid-123',
      issueTypes: ['screen_broken'],
      locale: 'fr',
    };

    it('should create the subscription and send a confirmation email', async () => {
      mockNotificationsProxy.send.mockReturnValueOnce(of({ id: 'sub-1' }));
      mockNotificationsProxy.send.mockReturnValueOnce(of({ success: true }));

      const result = await controller.createTutorialSubscription(dto);

      expect(result).toEqual({ success: true });
      expect(mockNotificationsProxy.send).toHaveBeenNthCalledWith(
        1,
        { cmd: 'create_tutorial_subscription' },
        {
          email: dto.email,
          deviceId: dto.deviceId,
          issueTypes: dto.issueTypes,
          locale: dto.locale,
        },
      );
      expect(mockNotificationsProxy.send).toHaveBeenNthCalledWith(
        2,
        { cmd: 'send_email' },
        expect.objectContaining({ to: dto.email }),
      );
    });

    it('should still return success when the confirmation email fails to send', async () => {
      mockNotificationsProxy.send.mockReturnValueOnce(of({ id: 'sub-1' }));
      mockNotificationsProxy.send.mockReturnValueOnce(
        throwError(() => new Error('smtp down')),
      );

      const result = await controller.createTutorialSubscription(dto);

      expect(result).toEqual({ success: true });
    });

    it('should throw HttpException when creating the subscription fails', async () => {
      mockNotificationsProxy.send.mockReturnValueOnce(
        throwError(() => new Error('service down')),
      );

      await expect(controller.createTutorialSubscription(dto)).rejects.toThrow(
        HttpException,
      );
      expect(mockNotificationsProxy.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('the model a subscription waits on', () => {
    const base = { email: 'user@example.com', locale: 'fr' };
    const created = () => mockNotificationsProxy.send.mock.calls[0][1];

    beforeEach(() => {
      mockNotificationsProxy.send.mockReturnValue(of({ id: 'sub-1' }));
    });

    it('takes it from a catalogue id', async () => {
      mockResolver.resolve.mockResolvedValue({ modelId: 953560, deviceId: 7 });
      await controller.createTutorialSubscription({ ...base, deviceId: '7' });
      expect(mockResolver.resolve).toHaveBeenCalledWith({ deviceId: 7 });
      expect(created().modelId).toBe(953560);
    });

    it('subscribes a free-text device without a model, as before', async () => {
      await controller.createTutorialSubscription({
        ...base,
        deviceId: 'manual_1791206396454',
      });
      expect(mockResolver.resolve).not.toHaveBeenCalled();
      expect(created().modelId).toBeUndefined();
    });

    it('subscribes even when the catalogue id names no model', async () => {
      mockResolver.resolve.mockRejectedValue(new HttpException('gone', 404));
      await controller.createTutorialSubscription({ ...base, deviceId: '9' });
      expect(created().modelId).toBeUndefined();
    });

    it('checks a catalogue id sent with a model against it', async () => {
      mockResolver.resolve.mockRejectedValue(new HttpException('other', 400));
      await expect(
        controller.createTutorialSubscription({
          ...base,
          modelId: 877165,
          deviceId: '724390',
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect(mockResolver.resolve).toHaveBeenCalledWith({
        modelId: 877165,
        deviceId: 724390,
      });
    });

    it('refuses a model that does not exist', async () => {
      mockResolver.resolve.mockRejectedValue(new HttpException('gone', 404));
      await expect(
        controller.createTutorialSubscription({ ...base, modelId: 9 }),
      ).rejects.toMatchObject({ status: 404 });
      expect(mockNotificationsProxy.send).not.toHaveBeenCalled();
    });
  });
});
