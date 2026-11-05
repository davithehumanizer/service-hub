/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TraceIdInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();

    const traceId = req?.headers?.['x-trace-id'] || uuidv4();
    const sessionId = req?.headers?.['x-session-id'];
    const correlationId = req?.headers?.['x-correlation-id'] || traceId;

    try {
      this.cls.set('traceId', traceId);
      this.cls.set('sessionId', sessionId);
      this.cls.set('correlationId', correlationId);
    } catch {
      // CLS context not active (e.g. /.well-known/* routes excluded from global prefix)
    }

    return next.handle();
  }
}
