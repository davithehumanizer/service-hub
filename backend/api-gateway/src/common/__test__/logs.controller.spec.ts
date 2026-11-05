import { Test, TestingModule } from '@nestjs/testing';
import { LogsController } from '../logs.controller';
import { FluentLoggerService } from '../fluent-logger.service';

describe('LogsController', () => {
  let controller: LogsController;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogsController],
      providers: [{ provide: FluentLoggerService, useValue: mockLogger }],
    }).compile();

    controller = module.get<LogsController>(LogsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call logger.error when level is "error"', () => {
      const body = {
        action: 'CRASH',
        level: 'error' as const,
        metadata: { component: 'App' },
        url: '/app',
        userAgent: 'Chrome',
      };
      const result = controller.create(body);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[Frontend] CRASH',
        expect.objectContaining({
          component: 'App',
          frontendUrl: '/app',
          frontendUserAgent: 'Chrome',
        }),
      );
      expect(result).toEqual({ success: true });
    });

    it('should call logger.warn when level is "warn"', () => {
      const body = {
        action: 'SLOW_RENDER',
        level: 'warn' as const,
        metadata: {},
        url: '/app/devices',
        userAgent: 'Firefox',
      };
      const result = controller.create(body);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[Frontend] SLOW_RENDER',
        expect.objectContaining({ frontendUrl: '/app/devices' }),
      );
      expect(result).toEqual({ success: true });
    });

    it('should call logger.log when level is "info" (default)', () => {
      const body = {
        action: 'PAGE_VIEW',
        level: 'info' as const,
        metadata: { page: 'home' },
        url: '/app',
        userAgent: 'Safari',
      };
      const result = controller.create(body);

      expect(mockLogger.log).toHaveBeenCalledWith(
        '[Frontend] PAGE_VIEW',
        expect.objectContaining({ page: 'home', frontendUrl: '/app' }),
      );
      expect(result).toEqual({ success: true });
    });

    it('should default to "info" level when level is not specified', () => {
      const body = { action: 'CLICK', url: '/app', userAgent: 'Edge' };
      const result = controller.create(body);

      expect(mockLogger.log).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should handle missing metadata gracefully (defaults to {})', () => {
      const body = {
        action: 'TEST',
        level: 'info' as const,
        url: '/app',
        userAgent: 'Chrome',
      };
      const result = controller.create(body);

      expect(mockLogger.log).toHaveBeenCalledWith(
        '[Frontend] TEST',
        expect.objectContaining({
          frontendUrl: '/app',
          frontendUserAgent: 'Chrome',
        }),
      );
      expect(result).toEqual({ success: true });
    });
  });
});
