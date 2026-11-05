import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { ApiVersioningService } from './api-versioning.service';

@Injectable()
export class ApiVersioningInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ApiVersioningInterceptor.name);

  constructor(private readonly versioningService: ApiVersioningService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const version = this.versioningService.extractVersion(request);

    // Store version in request object so controllers can access it
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (request as any).apiVersion = version;

    this.logger.debug(
      `API Versioning Interceptor: detected version ${version} for ${request.method} ${request.url}`,
    );

    return next.handle();
  }
}
