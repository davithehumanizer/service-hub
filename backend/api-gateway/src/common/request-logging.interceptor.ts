import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { FluentLoggerService } from './fluent-logger.service';

/**
 * Routes that would flood the pipeline without telling us anything.
 *
 * The health probe runs on a timer, and the desktop polls a handoff session
 * every two seconds for as long as the pairing screen is open — 30 lines a
 * minute per session, and as many error lines once the pairing has expired.
 * What actually becomes of a handoff is carried by its own `handoff_*` events.
 */
const UNLOGGED_ROUTES = [
  /^\/api\/health$/,
  /^\/api\/v\d+\/identification\/handoff\/[^/]+\/status$/,
];

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  constructor(private readonly fluentLogger: FluentLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, originalUrl, ip } = request;

    const path = originalUrl.split('?')[0];
    if (UNLOGGED_ROUTES.some((route) => route.test(path))) {
      return next.handle();
    }

    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    // Both callbacks, not only `next`: a failing request never reaches the
    // success path, so a 4xx/5xx used to produce no line carrying
    // `metadata.statusCode` at all — the error panels had nothing to read.
    return next.handle().pipe(
      tap({
        next: () => {
          const { statusCode } = response;
          const responseTime = Date.now() - now;

          this.fluentLogger.log(
            `${method} ${originalUrl} ${statusCode} - ${responseTime}ms`,
            {
              method,
              originalUrl,
              statusCode,
              responseTime,
              userAgent,
              ip,
              contentLength: response.get('content-length'),
            },
          );
        },
        error: (error: unknown) => {
          // The exception filter has not run yet, so the response still
          // carries its default status: take it from the exception.
          const statusCode =
            error instanceof HttpException
              ? error.getStatus()
              : HttpStatus.INTERNAL_SERVER_ERROR;
          const responseTime = Date.now() - now;

          this.fluentLogger.error(
            `${method} ${originalUrl} ${statusCode} - ${responseTime}ms`,
            {
              method,
              originalUrl,
              statusCode,
              responseTime,
              userAgent,
              ip,
              errorMessage:
                error instanceof Error ? error.message : String(error),
            },
          );
        },
      }),
    );
  }
}
