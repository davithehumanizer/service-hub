/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PermissionsGuard } from '../permission.guard';
import { Reflector } from '@nestjs/core';
import { RoleCacheService } from '../../roles/role-cache.service';
import {
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let roleCacheService: RoleCacheService;

  beforeEach(() => {
    reflector = { get: jest.fn() } as any;
    roleCacheService = {
      getGuestRole: jest.fn().mockReturnValue({ permissions: [] }),
    } as any;
    guard = new PermissionsGuard(reflector, roleCacheService);
  });

  it('should allow if no permissions are required', () => {
    (reflector.get as jest.Mock).mockReturnValue(undefined);
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: { permissions: [] } } }),
      }),
    } as any;
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow if user has all required permissions', () => {
    (reflector.get as jest.Mock).mockReturnValue(['read']);
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            role: { permissions: [{ name: 'read' }, { name: 'write' }] },
          },
        }),
      }),
    } as any;
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw if user does not have required permissions', () => {
    (reflector.get as jest.Mock).mockReturnValue(['admin']);
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: { permissions: [{ name: 'read' }] } },
        }),
      }),
    } as any;
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow when client has required scope', () => {
    (reflector.get as jest.Mock).mockReturnValue(['scope:A']);
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ client: { id: 1 }, scope: 'scope:A scope:B' }),
      }),
    } as any;
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw when client lacks required scope', () => {
    (reflector.get as jest.Mock).mockReturnValue(['scope:X']);
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ client: { id: 1 }, scope: 'scope:A' }),
      }),
    } as any;
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should fallback to guest role and throw when guest lacks permission', async () => {
    (reflector.get as jest.Mock).mockReturnValue(['guest:perm']);
    (roleCacheService.getGuestRole as jest.Mock).mockResolvedValue({
      permissions: [{ name: 'other' }],
    });
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as any;
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should fallback to guest role and allow when guest has permission', async () => {
    (reflector.get as jest.Mock).mockReturnValue(['guest:perm']);
    (roleCacheService.getGuestRole as jest.Mock).mockResolvedValue({
      permissions: [{ name: 'guest:perm' }],
    });
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as any;
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should refuse a guest with 503 while the guest role is unavailable', async () => {
    (reflector.get as jest.Mock).mockReturnValue(['guest:perm']);
    (roleCacheService.getGuestRole as jest.Mock).mockResolvedValue(undefined);
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as any;
    await expect(guard.canActivate(context)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
