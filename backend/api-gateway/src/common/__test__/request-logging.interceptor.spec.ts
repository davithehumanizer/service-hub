import {
  CallHandler,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { RequestLoggingInterceptor } from '../request-logging.interceptor';
import { FluentLoggerService } from '../fluent-logger.service';

describe('RequestLoggingInterceptor', () => {
  let interceptor: RequestLoggingInterceptor;
  let fluentLogger: jest.Mocked<Pick<FluentLoggerService, 'log' | 'error'>>;

  const contextFor = (originalUrl: string, statusCode = 200) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl,
          ip: '127.0.0.1',
          get: () => 'jest',
        }),
        getResponse: () => ({ statusCode, get: () => '42' }),
      }),
    }) as unknown as ExecutionContext;

  const handlerOf = (source: any) =>
    ({ handle: () => source }) as unknown as CallHandler;

  beforeEach(() => {
    fluentLogger = { log: jest.fn(), error: jest.fn() };
    interceptor = new RequestLoggingInterceptor(
      fluentLogger as unknown as FluentLoggerService,
    );
  });

  it('logs a successful request with its status code', (done) => {
    interceptor
      .intercept(contextFor('/api/v1/devices'), handlerOf(of('ok')))
      .subscribe(() => {
        expect(fluentLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/devices 200'),
          expect.objectContaining({ statusCode: 200, method: 'GET' }),
        );
        done();
      });
  });

  it('logs a failing request with the status carried by the exception', (done) => {
    interceptor
      .intercept(
        contextFor('/api/v1/devices/unknown'),
        handlerOf(throwError(() => new NotFoundException('nope'))),
      )
      .subscribe({
        error: () => {
          expect(fluentLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('404'),
            expect.objectContaining({
              statusCode: 404,
              originalUrl: '/api/v1/devices/unknown',
              errorMessage: 'nope',
            }),
          );
          done();
        },
      });
  });

  it('falls back to 500 for a non-HTTP exception', (done) => {
    interceptor
      .intercept(
        contextFor('/api/v1/devices'),
        handlerOf(throwError(() => new Error('boom'))),
      )
      .subscribe({
        error: () => {
          expect(fluentLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('500'),
            expect.objectContaining({ statusCode: 500 }),
          );
          done();
        },
      });
  });

  it('skips the handoff status poll, hit every two seconds per session', (done) => {
    interceptor
      .intercept(
        contextFor('/api/v1/identification/handoff/abc-123/status'),
        handlerOf(of('ok')),
      )
      .subscribe(() => {
        expect(fluentLogger.log).not.toHaveBeenCalled();
        done();
      });
  });

  it('still logs the other handoff routes', (done) => {
    interceptor
      .intercept(
        contextFor('/api/v1/identification/handoff/abc-123/barcode'),
        handlerOf(of('ok')),
      )
      .subscribe(() => {
        expect(fluentLogger.log).toHaveBeenCalled();
        done();
      });
  });

  it('skips the health probe entirely', (done) => {
    interceptor
      .intercept(contextFor('/api/health'), handlerOf(of('ok')))
      .subscribe(() => {
        expect(fluentLogger.log).not.toHaveBeenCalled();
        done();
      });
  });
});
