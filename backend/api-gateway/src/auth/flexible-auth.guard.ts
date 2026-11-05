/* eslint-disable @typescript-eslint/no-unsafe-return */

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, from } from 'rxjs';
import { RoleCacheService } from 'src/roles/role-cache.service';

@Injectable()
export class FlexibleAuthGuard extends AuthGuard(['jwt']) {
  private readonly logger = new Logger(FlexibleAuthGuard.name);

  constructor(
    @Inject('AUTH_SERVICE') private readonly authService: ClientProxy,
    private roleCacheService: RoleCacheService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    this.logger.log(`canActivate called for path: ${request.path}`);

    // 1. Try Passport's default authentication (JWT, Google, Facebook sessions)
    try {
      // This will call handleRequest on success
      const passportResult = await firstValueFrom(
        from(super.canActivate(context) as any),
      ); // Ensure it's an Observable
      this.logger.log(`Passport authentication result`, { passportResult });
      if (passportResult) {
        this.logger.log(
          'Passport authentication successful (JWT or social session).',
        );
        return true;
      }
      // If passportResult is false or null, it means authentication failed.
      // Do not return false here, let the execution continue to the next authentication method.
      this.logger.warn(
        'Passport authentication failed: passportResult is false/null. Falling back to other methods.',
      );
    } catch (error) {
      this.logger.warn(
        `Passport authentication failed: ${error.message}. Falling back to other methods.`,
      );
      // If an error is caught, do not return false here, let the execution continue to the next authentication method.
    }

    this.logger.log(
      'Passport authentication failed or not applicable. Next steps... trying client credentials.',
    );

    // 2. If Passport fails, try Client Credentials for Bearer tokens
    const authHeader =
      request.headers['authorization'] || request.headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      this.logger.log('Attempting client credentials validation...');
      try {
        const result = await firstValueFrom(
          this.authService.send({ cmd: 'validate_token' }, { token }),
        );

        if (result && result.active) {
          request.client = result.client;
          request.scope = result.scope;
          this.logger.log('Client credentials validation successful.');
          return true;
        }
      } catch (e) {
        this.logger.warn(`Client credentials validation failed: ${e.message}.`);
      }
    }

    this.logger.log(
      'Client credentials validation failed or not applicable. Next steps... trying role-based access.',
    );

    // 3. If all else fails, assign guest role and allow access
    this.logger.log(
      'All authentication methods failed or not applicable. Assigning guest role.',
    );
    const guestRole = await this.roleCacheService.getGuestRole();
    if (!guestRole) {
      this.logger.error('Guest role not found. Cannot assign guest role.');
      throw new UnauthorizedException('Guest role not found');
    }

    // Assign a minimal guest user object
    request.user = { role: guestRole.name };
    this.logger.log(`Assigned guest role: ${guestRole.name}`);
    return true;
  }

  // handleRequest is called by Passport AFTER a strategy (e.g., jwt, google) succeeds.
  handleRequest(err, user, info, context) {
    const request = context.switchToHttp().getRequest();
    this.logger.log(
      `handleRequest called for strategy: ${info?.name || 'unknown'}. Path: ${request.path}.`,
      { info },
    );

    if (info?.name === 'jwt') {
      this.logger.log('handleRequest: Processing JWT strategy.');
    }

    if (err || !user) {
      this.logger.warn(
        `handleRequest: Authentication via strategy ${info?.name || 'unknown'} failed. Error: ${err?.message}.`,
        { info },
      );

      // If there's an error in 'err' or 'info' (e.g., JsonWebTokenError), re-throw it.
      if (err) {
        return null;
      }
      if (
        info &&
        typeof info === 'object' &&
        info.name === 'JsonWebTokenError'
      ) {
        throw new UnauthorizedException(info.message); // Re-throw the JWT error
      }

      // If no user, but no error, return null to allow fallback.
      return null;
    }

    // If authentication was successful, Passport gives us the user object.
    // Check if it's an OAuth2 token or a regular user token
    if (user.isOAuth2) {
      this.logger.log(
        `handleRequest: OAuth2 client credentials detected. Client: ${user.clientId}`,
      );
      // For OAuth2 tokens, set client and scope on the request
      request.client = { id: user.clientId };
      request.scope = user.scope;
      // Don't set request.user for OAuth2 tokens
      return user; // Return the user object so Passport knows auth succeeded
    }

    // For regular user tokens, Passport will attach the user to request.user
    this.logger.log(`handleRequest: User authentication successful.`, { user });
    return user;
  }
}
