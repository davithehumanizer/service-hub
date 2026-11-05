/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { FlexibleAuthGuard } from '../flexible-auth.guard';
import { RoleCacheService } from 'src/roles/role-cache.service';
import { AuthGuard } from '@nestjs/passport';

describe('FlexibleAuthGuard', () => {
  let guard: FlexibleAuthGuard;
  let authService: ClientProxy;
  let roleCacheService: RoleCacheService;

  const mockContext = (authHeader?: string, initialUser?: any) => {
    const request: any = {
      headers: { authorization: authHeader },
      user: initialUser, // Allow initial user to be set
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlexibleAuthGuard,
        {
          provide: 'AUTH_SERVICE',
          useValue: {
            send: jest.fn(),
          },
        },
        {
          provide: RoleCacheService,
          useValue: {
            getGuestRole: jest.fn().mockReturnValue({ name: 'guest' }),
          },
        },
      ],
    }).compile();

    guard = module.get<FlexibleAuthGuard>(FlexibleAuthGuard);
    authService = module.get<ClientProxy>('AUTH_SERVICE');
    roleCacheService = module.get<RoleCacheService>(RoleCacheService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access with a valid JWT token', async () => {
      const user = { userId: 1, role: 'user' };
      // Mock the internal call to AuthGuard('jwt').canActivate
      jest
        .spyOn(AuthGuard('jwt').prototype, 'canActivate')
        .mockImplementationOnce(async (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = user; // Manually set the user on the request object
          return user; // Return the user object directly
        });

      const context = mockContext('Bearer valid_jwt_token');
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(context.switchToHttp().getRequest().user).toEqual(user);
    });

    it('should allow access with valid client credentials token if JWT fails', async () => {
      jest
        .spyOn(AuthGuard('jwt').prototype, 'canActivate')
        .mockImplementationOnce(async () => null); // Simulate JWT failure by returning null
      jest
        .spyOn(authService, 'send')
        .mockReturnValueOnce(of({ active: true, client: 'test_client' }));

      const context = mockContext('Bearer valid_client_token');
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(context.switchToHttp().getRequest().client).toBe('test_client');
    });

    it('should assign guest role if no token is provided', async () => {
      const context = mockContext();
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(context.switchToHttp().getRequest().user).toEqual({
        role: 'guest',
      });
    });

    it('should assign guest role if token validation fails for both JWT and client credentials', async () => {
      jest
        .spyOn(AuthGuard('jwt').prototype, 'canActivate')
        .mockImplementationOnce(async () => null); // Simulate JWT failure
      jest
        .spyOn(authService, 'send')
        .mockReturnValueOnce(of({ active: false })); // Simulate client credentials failure

      const context = mockContext('Bearer invalid_token');
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(context.switchToHttp().getRequest().user).toEqual({
        role: 'guest',
      });
    });

    it('should assign guest role if client credentials service throws an error', async () => {
      jest
        .spyOn(AuthGuard('jwt').prototype, 'canActivate')
        .mockImplementationOnce(async () => null); // Simulate JWT failure
      jest
        .spyOn(authService, 'send')
        .mockReturnValueOnce(throwError(() => new Error('Service error'))); // Simulate service error

      const context = mockContext('Bearer token_with_service_error');
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(context.switchToHttp().getRequest().user).toEqual({
        role: 'guest',
      });
    });
  });

  describe('handleRequest', () => {
    it('should return user if no error and user is provided', () => {
      const user = { userId: 1, role: 'user' };
      const context = mockContext(undefined, user);
      expect(guard.handleRequest(null, user, null, context)).toEqual(user);
    });

    it('should return null if error is present', () => {
      const error = new UnauthorizedException();
      const context = mockContext();
      expect(guard.handleRequest(error, null, null, context)).toBeNull();
    });

    it('should return null if no user and no error', () => {
      const context = mockContext();
      expect(guard.handleRequest(null, null, null, context)).toBeNull();
    });
  });
});
