import { Test, TestingModule } from '@nestjs/testing';
import { FluentLoggerService } from '../fluent-logger.service';
import { ClsService } from 'nestjs-cls';
import * as fluentLogger from 'fluent-logger';

jest.mock('fluent-logger');

describe('FluentLoggerService', () => {
  let service: FluentLoggerService;
  let clsService: ClsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FluentLoggerService,
        {
          provide: ClsService,
          useValue: {
            get: jest.fn().mockReturnValue('test-trace-id'),
          },
        },
      ],
    }).compile();

    service = module.get<FluentLoggerService>(FluentLoggerService);
    clsService = module.get<ClsService>(ClsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should log info message', () => {
      process.env.NODE_ENV = 'production';
      const spy = jest.spyOn(console, 'log').mockImplementation();

      service.log('test message', { key: 'value' });

      expect(fluentLogger.emit).toHaveBeenCalledWith(
        'api-gateway.info',
        expect.objectContaining({
          message: 'test message',
          metadata: { key: 'value' },
          traceId: 'test-trace-id',
          service: 'api-gateway',
        }),
      );

      spy.mockRestore();
      process.env.NODE_ENV = 'test';
    });
  });

  describe('error', () => {
    it('should log error message', () => {
      process.env.NODE_ENV = 'production';
      const spy = jest.spyOn(console, 'error').mockImplementation();

      service.error('error message', { error: 'details' });

      expect(fluentLogger.emit).toHaveBeenCalledWith(
        'api-gateway.error',
        expect.objectContaining({
          message: 'error message',
          metadata: { error: 'details' },
          traceId: 'test-trace-id',
          service: 'api-gateway',
        }),
      );

      spy.mockRestore();
      process.env.NODE_ENV = 'test';
    });
  });

  describe('warn', () => {
    it('should log warn message', () => {
      process.env.NODE_ENV = 'production';
      const spy = jest.spyOn(console, 'warn').mockImplementation();

      service.warn('warn message');

      expect(fluentLogger.emit).toHaveBeenCalledWith(
        'api-gateway.warn',
        expect.objectContaining({
          message: 'warn message',
          traceId: 'test-trace-id',
          service: 'api-gateway',
        }),
      );

      spy.mockRestore();
      process.env.NODE_ENV = 'test';
    });
  });

  describe('debug', () => {
    it('should log debug message', () => {
      process.env.NODE_ENV = 'production';
      const spy = jest.spyOn(console, 'debug').mockImplementation();

      service.debug('debug message');

      expect(fluentLogger.emit).toHaveBeenCalledWith(
        'api-gateway.debug',
        expect.objectContaining({
          message: 'debug message',
          traceId: 'test-trace-id',
          service: 'api-gateway',
        }),
      );

      spy.mockRestore();
      process.env.NODE_ENV = 'test';
    });
  });

  describe('verbose', () => {
    it('should log verbose message', () => {
      process.env.NODE_ENV = 'production';
      const spy = jest.spyOn(console, 'log').mockImplementation();

      service.verbose('verbose message');

      expect(fluentLogger.emit).toHaveBeenCalledWith(
        'api-gateway.verbose',
        expect.objectContaining({
          message: 'verbose message',
          traceId: 'test-trace-id',
          service: 'api-gateway',
        }),
      );

      spy.mockRestore();
      process.env.NODE_ENV = 'test';
    });
  });
});
