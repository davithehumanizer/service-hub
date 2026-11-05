/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCacheService } from 'src/roles/role-cache.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private roleCacheService: RoleCacheService,
  ) {}
  private readonly logger = new Logger(PermissionsGuard.name);

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // 1. User-based permission (standard JWT user)
    const user = request.user;
    if (user?.role?.permissions) {
      const userPermissions = user.role.permissions.map((p) => p.name);
      const hasUserPermission = requiredPermissions.every((p) =>
        userPermissions.includes(p),
      );

      if (!hasUserPermission) {
        this.logger.warn(
          `Access denied for user ${user.id}: lacks permissions ${requiredPermissions.join(', ')}`,
        );
        throw new ForbiddenException('Access denied: user lacks permissions');
      }

      return true;
    }

    // 2. OAuth2 Client-based permission (client credentials)
    const client = request.client;
    const scope = request.scope;
    if (client && scope) {
      const clientScopes = scope.split(' ');
      const hasScopePermission = requiredPermissions.every((p) =>
        clientScopes.includes(p),
      );

      if (!hasScopePermission) {
        this.logger.warn(
          `Access denied for client ${client.id}: lacks scope ${requiredPermissions.join(', ')}`,
        );
        throw new ForbiddenException('Access denied: client lacks scope');
      }

      return true;
    }

    // 3. Fallback: treat as guest if no user/client
    return this.allowGuest(requiredPermissions);
  }

  private async allowGuest(requiredPermissions: string[]): Promise<boolean> {
    const guestRole = await this.roleCacheService.getGuestRole();
    // Refused rather than a TypeError, which answered every guest with a 500.
    if (!guestRole?.permissions) {
      this.logger.error('Guest role unavailable: refusing guest request');
      throw new ServiceUnavailableException('Guest role unavailable');
    }
    const guestPermissions = guestRole.permissions.map((p) => p.name);
    const hasGuestPermission = requiredPermissions.every((p) =>
      guestPermissions.includes(p),
    );

    if (!hasGuestPermission) {
      this.logger.warn(
        `Access denied for guest: lacks permission ${requiredPermissions.join(', ')}`,
      );
      throw new ForbiddenException('Access denied: guest lacks permission');
    }

    return true;
  }
}
