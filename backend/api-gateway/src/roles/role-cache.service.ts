/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/roles/role-cache.service.ts
import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

/** How long a guest request waits for user-management before giving up. */
const LOAD_TIMEOUT_MS = 5000;

@Injectable()
export class RoleCacheService implements OnModuleInit {
  private guestRole: any;
  private loading: Promise<any> | null = null;

  constructor(
    @Inject('USER_SERVICE') private readonly userService: ClientProxy,
  ) {}

  async onModuleInit() {
    await this.load();
  }

  /**
   * The guest role, loaded again while it is missing. Loaded at boot only, a
   * gateway started before user-management answered kept none, and every
   * guest request on a guarded route failed until it was restarted.
   */
  async getGuestRole() {
    return this.guestRole ?? this.load();
  }

  // One attempt at a time, shared by the guests asking meanwhile, and bounded:
  // a user-management that never answers must not hold their requests.
  private load(): Promise<any> {
    this.loading ??= firstValueFrom(
      this.userService
        .send({ cmd: 'get_role_by_name' }, { name: 'guest' })
        .pipe(timeout(LOAD_TIMEOUT_MS)),
    )
      .then((role) => {
        this.guestRole = role;
        console.log('Guest role loaded:', role);
        return role;
      })
      .catch((err) => {
        console.error('Failed to load guest role', err);
        return undefined;
      })
      .finally(() => {
        this.loading = null;
      });
    return this.loading;
  }
}
