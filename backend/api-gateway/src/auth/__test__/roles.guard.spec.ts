/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { RolesGuard } from '../roles.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { get: jest.fn() } as any;
    guard = new RolesGuard(reflector);
  });

  it('should allow if no roles are required', () => {
    (reflector.get as jest.Mock).mockReturnValue(undefined);
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'user' } }) }),
    } as any;
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow if user has required role', () => {
    (reflector.get as jest.Mock).mockReturnValue(['admin']);
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'admin' } }) }),
    } as any;
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw if user does not have required role', () => {
    (reflector.get as jest.Mock).mockReturnValue(['admin']);
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'user' } }) }),
    } as any;
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
