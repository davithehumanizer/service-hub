/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, LoggerService } from '@nestjs/common';
import * as fluentLogger from 'fluent-logger';
import { ClsService } from 'nestjs-cls';
import * as os from 'os';
import { redactSensitive } from './log-redaction';

@Injectable()
export class FluentLoggerService implements LoggerService {
  private readonly baseData: Record<string, any>;

  constructor(private readonly cls: ClsService) {
    fluentLogger.configure('api-gateway', {
      host: 'fluentd',
      port: 24224,
    });

    this.baseData = {
      service: 'api-gateway',
      hostname: os.hostname(),
      env: process.env.NODE_ENV || 'development',
    };
  }

  log(message: string, data: any = {}) {
    const safe = redactSensitive(data);
    const payload = this.buildPayload(message, safe);
    console.log('[INFO]', message, safe);
    fluentLogger.emit('api-gateway.info', payload);
  }

  error(message: string, data: any = {}) {
    const safe = redactSensitive(data);
    const payload = this.buildPayload(message, safe);
    console.error('[ERROR]', message, safe);
    fluentLogger.emit('api-gateway.error', payload);
  }

  warn(message: string, data: any = {}) {
    const safe = redactSensitive(data);
    const payload = this.buildPayload(message, safe);
    console.warn('[WARN]', message, safe);
    fluentLogger.emit('api-gateway.warn', payload);
  }

  debug(message: string, data: any = {}) {
    const safe = redactSensitive(data);
    const payload = this.buildPayload(message, safe);
    console.debug('[DEBUG]', message, safe);
    fluentLogger.emit('api-gateway.debug', payload);
  }

  verbose(message: string, data: any = {}) {
    const safe = redactSensitive(data);
    const payload = this.buildPayload(message, safe);
    console.log('[VERBOSE]', message, safe);
    fluentLogger.emit('api-gateway.verbose', payload);
  }

  private getCurrentTraceId(): string | undefined {
    return this.cls.get('traceId');
  }

  private buildPayload(message: string, data: any) {
    const payload: any = {
      timestamp: new Date().toISOString(),
      message,
      ...this.baseData,
      traceId: this.getCurrentTraceId(),
      sessionId: this.cls.get('sessionId'),
      correlationId: this.cls.get('correlationId'),
    };

    if (data !== undefined && data !== null) {
      if (typeof data === 'string') {
        payload.context = data;
      } else if (typeof data === 'object') {
        if (Object.keys(data).length > 0) {
          payload.metadata = data;
        }
      } else {
        payload.context = String(data);
      }
    }

    return payload;
  }
}
