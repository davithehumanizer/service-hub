/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError, firstValueFrom } from 'rxjs';
import {
  UnauthorizedException,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { RoleCacheService } from 'src/roles/role-cache.service';

describe('AuthController', () => {
  let controller: AuthController;
  let userService: ClientProxy;
  let authService: ClientProxy;

  const mockClientProxy = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: 'USER_SERVICE', useValue: mockClientProxy },
        { provide: 'AUTH_SERVICE', useValue: mockClientProxy },
        {
          provide: RoleCacheService,
          useValue: {
            getRoles: jest.fn(),
          },
        },
      ],
    }).compile();
    controller = module.get<AuthController>(AuthController);
    userService = module.get('USER_SERVICE');
    authService = module.get('AUTH_SERVICE');
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Google OAuth', () => {
    it('should redirect to Google for authentication', async () => {
      const req: any = {}; // req object is not used in the controller for this route
      await controller.googleAuth(req);
      // No explicit assertion needed as it's a redirect, just ensure no error is thrown
      expect(true).toBe(true);
    });

    it('should handle Google callback and send social_login message', async () => {
      const mockUser = {
        email: 'google@example.com',
        firstName: 'Google',
        lastName: 'User',
      };
      const req: any = { user: mockUser };
      const mockRes: any = { redirect: jest.fn() }; // Mock res object
      mockClientProxy.send.mockReturnValue(
        of({ access_token: 'google_token' }),
      );

      await controller.googleAuthRedirect(req, mockRes); // Pass mockRes

      expect(authService.send).toHaveBeenCalledWith(
        { cmd: 'social_login' },
        { user: mockUser },
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        302, // Expect the status code
        expect.stringContaining('token=google_token'), // Expect the URL with 'token='
      ); // Assert redirect was called with token
    });
  });

  describe('Facebook OAuth', () => {
    it('should redirect to Facebook for authentication', async () => {
      const req: any = {}; // req object is not used in the controller for this route
      await controller.facebookAuth(req);
      // No explicit assertion needed as it's a redirect, just ensure no error is thrown
      expect(true).toBe(true);
    });

    it('should handle Facebook callback and send social_login message', async () => {
      const mockUser = {
        email: 'facebook@example.com',
        firstName: 'Facebook',
        lastName: 'User',
      };
      const req: any = { user: mockUser };
      const mockRes: any = { redirect: jest.fn() }; // Mock res object
      mockClientProxy.send.mockReturnValue(
        of({ access_token: 'facebook_token' }),
      );

      await controller.facebookAuthRedirect(req, mockRes); // Pass mockRes

      expect(authService.send).toHaveBeenCalledWith(
        { cmd: 'social_login' },
        { user: mockUser },
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        302, // Expect the status code
        expect.stringContaining('token=facebook_token'), // Expect the URL with 'token='
      ); // Assert redirect was called with token
    });
  });

  it('should login user', async () => {
    const body = { email: 'a', password: 'b' };
    const req: any = {}; // controller.login expects a req param
    mockClientProxy.send.mockReturnValue(of({ token: 'abc' }));
    const result = await controller.login(body, req);
    expect(result).toEqual({ token: 'abc' });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'login_user' },
      body,
    );
  });

  it('should throw on login error', async () => {
    const body = { email: 'a', password: 'b' };
    const req: any = {};
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.login(body, req)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should exchange a refresh token', async () => {
    const body = { refresh_token: 'opaque-token' };
    mockClientProxy.send.mockReturnValue(
      of({ access_token: 'def', refresh_token: 'rotated' }),
    );
    const result = await controller.refresh(body);
    expect(result).toEqual({ access_token: 'def', refresh_token: 'rotated' });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'refresh_token' },
      { refresh_token: 'opaque-token' },
    );
  });

  it('should forward only the refresh token, never an email', async () => {
    mockClientProxy.send.mockReturnValue(of({ access_token: 'def' }));
    await controller.refresh({
      refresh_token: 'opaque-token',
      email: 'victim@test.com',
    } as never);
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'refresh_token' },
      { refresh_token: 'opaque-token' },
    );
  });

  it('should throw on refresh error', async () => {
    const body = { refresh_token: 'stolen' };
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.refresh(body)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should report success on logout even when revocation fails', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('down')));
    await expect(controller.logout({ refresh_token: 'x' })).resolves.toEqual({
      success: true,
    });
  });

  it('should get oauth2 token', async () => {
    const body = {
      client_id: 'test-client',
      client_secret: 'test-secret',
      grant_type: 'client_credentials',
    };
    mockClientProxy.send.mockReturnValue(
      of({
        access_token: 'tok',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
      }),
    );
    const req: any = {
      headers: {
        authorization:
          'Basic ' + Buffer.from('test-client:test-secret').toString('base64'),
      },
    };
    const result = await controller.oauth2Token(body, req);
    expect(result).toEqual({
      access_token: 'tok',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'read write',
    });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'oauth2_token' },
      body,
    );
  });

  it('should throw on oauth2 token error', async () => {
    const body = {
      client_id: 'test-client',
      client_secret: 'test-secret',
      grant_type: 'client_credentials',
    };
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    const req: any = {
      headers: {
        authorization:
          'Basic ' + Buffer.from('test-client:test-secret').toString('base64'),
      },
    };
    await expect(controller.oauth2Token(body, req)).rejects.toThrow(
      HttpException,
    );
    await expect(controller.oauth2Token(body, req)).rejects.toMatchObject({
      status: 400,
      response: { error: 'invalid_request', error_description: 'fail' },
    });
  });

  it('should return invalid_client (401) for Invalid client credentials error', async () => {
    const body = {
      client_id: 'x',
      client_secret: 'y',
      grant_type: 'client_credentials',
    };
    mockClientProxy.send.mockReturnValue(
      throwError(() => new Error('Invalid client credentials')),
    );
    const req: any = { headers: {} };
    await expect(controller.oauth2Token(body, req)).rejects.toMatchObject({
      status: 401,
      response: { error: 'invalid_client' },
    });
  });

  it('should return unsupported_grant_type (400) for grant_type error', async () => {
    const body = { client_id: 'x', client_secret: 'y', grant_type: 'unknown' };
    mockClientProxy.send.mockReturnValue(
      throwError(() => new Error('grant_type is not supported')),
    );
    const req: any = { headers: {} };
    await expect(controller.oauth2Token(body, req)).rejects.toMatchObject({
      status: 400,
      response: { error: 'unsupported_grant_type' },
    });
  });

  it('should return invalid_scope (400) for scope error', async () => {
    const body = {
      client_id: 'x',
      client_secret: 'y',
      grant_type: 'client_credentials',
    };
    mockClientProxy.send.mockReturnValue(
      throwError(() => new Error('scope is invalid')),
    );
    const req: any = { headers: {} };
    await expect(controller.oauth2Token(body, req)).rejects.toMatchObject({
      status: 400,
      response: { error: 'invalid_scope' },
    });
  });

  it('should return server_error (500) for user not found error', async () => {
    const body = {
      client_id: 'x',
      client_secret: 'y',
      grant_type: 'client_credentials',
    };
    mockClientProxy.send.mockReturnValue(
      throwError(() => new Error('user not found in database')),
    );
    const req: any = { headers: {} };
    await expect(controller.oauth2Token(body, req)).rejects.toMatchObject({
      status: 500,
      response: { error: 'server_error' },
    });
  });

  it('should return invalid_grant (400) for authorization code error', async () => {
    const body = {
      client_id: 'x',
      client_secret: 'y',
      grant_type: 'authorization_code',
      code: 'expired',
    };
    mockClientProxy.send.mockReturnValue(
      throwError(() => new Error('authorization code expired')),
    );
    const req: any = { headers: {} };
    await expect(controller.oauth2Token(body, req)).rejects.toMatchObject({
      status: 400,
      response: { error: 'invalid_grant' },
    });
  });

  it('should return invalid_grant (400) for code_verifier error', async () => {
    const body = {
      client_id: 'x',
      client_secret: 'y',
      grant_type: 'authorization_code',
      code: 'c',
    };
    mockClientProxy.send.mockReturnValue(
      throwError(() => new Error('code_verifier failed PKCE')),
    );
    const req: any = { headers: {} };
    await expect(controller.oauth2Token(body, req)).rejects.toMatchObject({
      status: 400,
      response: { error: 'invalid_grant' },
    });
  });

  it('should return invalid_grant (400) for redirect uri error', async () => {
    const body = {
      client_id: 'x',
      client_secret: 'y',
      grant_type: 'authorization_code',
      code: 'c',
    };
    mockClientProxy.send.mockReturnValue(
      throwError(() => new Error('redirect uri mismatch')),
    );
    const req: any = { headers: {} };
    await expect(controller.oauth2Token(body, req)).rejects.toMatchObject({
      status: 400,
      response: { error: 'invalid_grant' },
    });
  });

  it('should return invalid_grant (400) for refresh token error', async () => {
    const body = {
      client_id: 'x',
      client_secret: 'y',
      grant_type: 'refresh_token',
      refresh_token: 'rt',
    };
    mockClientProxy.send.mockReturnValue(
      throwError(() => new Error('refresh token expired')),
    );
    const req: any = { headers: {} };
    await expect(controller.oauth2Token(body, req)).rejects.toMatchObject({
      status: 400,
      response: { error: 'invalid_grant' },
    });
  });

  it('should return invalid_grant (400) for code or redirect error', async () => {
    const body = {
      client_id: 'x',
      client_secret: 'y',
      grant_type: 'authorization_code',
      code: 'c',
    };
    mockClientProxy.send.mockReturnValue(
      throwError(() => new Error('code or redirect is invalid')),
    );
    const req: any = { headers: {} };
    await expect(controller.oauth2Token(body, req)).rejects.toMatchObject({
      status: 400,
      response: { error: 'invalid_grant' },
    });
  });

  it('should extract client_id/secret from Basic auth header if not in body', async () => {
    const body: any = { grant_type: 'client_credentials' };
    mockClientProxy.send.mockReturnValue(
      of({
        access_token: 'tok',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: '',
      }),
    );
    const req: any = {
      headers: {
        authorization:
          'Basic ' + Buffer.from('my-client:my-secret').toString('base64'),
      },
    };
    const result = await controller.oauth2Token(body, req);
    expect(result.access_token).toBe('tok');
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'oauth2_token' },
      expect.objectContaining({
        client_id: 'my-client',
        client_secret: 'my-secret',
      }),
    );
  });

  describe('oauth2Authorize', () => {
    it('should redirect to login page on valid request', async () => {
      mockClientProxy.send.mockReturnValue(of({ valid: true }));
      const query: any = {
        client_id: 'my-client',
        redirect_uri: 'http://localhost/callback',
        response_type: 'code',
        scope: 'openid',
        state: 'abc123',
        code_challenge: 'challenge',
        code_challenge_method: 'S256',
        nonce: 'nonce1',
      };
      const mockRes: any = { redirect: jest.fn() };
      await controller.oauth2Authorize(query, mockRes);
      expect(mockRes.redirect).toHaveBeenCalledWith(
        302,
        expect.stringContaining('/login?'),
      );
    });

    it('should throw BadRequestException when validation fails', async () => {
      mockClientProxy.send.mockReturnValue(of({ valid: false }));
      const query: any = {
        client_id: 'x',
        redirect_uri: 'http://localhost/cb',
        response_type: 'code',
      };
      const mockRes: any = { redirect: jest.fn() };
      await expect(
        controller.oauth2Authorize(query, mockRes),
      ).rejects.toThrow();
    });

    it('should throw BadRequestException on service error', async () => {
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('service down')),
      );
      const query: any = {
        client_id: 'x',
        redirect_uri: 'http://localhost/cb',
        response_type: 'code',
      };
      const mockRes: any = { redirect: jest.fn() };
      await expect(
        controller.oauth2Authorize(query, mockRes),
      ).rejects.toThrow();
    });

    it('should use default FRONTEND_URL when env var is not set', async () => {
      const original = process.env.FRONTEND_URL;
      delete process.env.FRONTEND_URL;
      mockClientProxy.send.mockReturnValue(of({ valid: true }));
      const query: any = {
        client_id: 'x',
        redirect_uri: 'http://cb',
        response_type: 'code',
        scope: '',
        state: '',
      };
      const mockRes: any = { redirect: jest.fn() };
      await controller.oauth2Authorize(query, mockRes);
      expect(mockRes.redirect).toHaveBeenCalledWith(
        302,
        expect.stringContaining('localhost:3010'),
      );
      if (original) process.env.FRONTEND_URL = original;
    });
  });

  describe('oauth2AuthorizeCallback', () => {
    /**
     * The callback issues two calls: oauth2_validate_authorize (which re-checks
     * redirect_uri against the client allow-list) then oauth2_generate_code.
     */
    const mockCallbackFlow = (
      codeResult: unknown,
      validation: unknown = { valid: true },
    ) => {
      mockClientProxy.send.mockImplementation((pattern: { cmd: string }) => {
        if (pattern.cmd === 'oauth2_validate_authorize') {
          return of(validation);
        }
        return codeResult instanceof Error
          ? throwError(() => codeResult)
          : of(codeResult);
      });
    };

    it('should return redirect URL with code and state', async () => {
      mockCallbackFlow({ code: 'auth-code-xyz' });
      const req: any = { user: { id: 42 } };
      const result = await controller.oauth2AuthorizeCallback(
        'my-client',
        'http://localhost/callback',
        'openid',
        'state123',
        'challenge',
        'S256',
        'nonce1',
        req,
      );
      expect(result.url).toContain('code=auth-code-xyz');
      expect(result.url).toContain('state=state123');
    });

    it('should return redirect URL with code but no state when state is empty', async () => {
      mockCallbackFlow({ code: 'auth-code-xyz' });
      const req: any = { user: { id: 42 } };
      const result = await controller.oauth2AuthorizeCallback(
        'my-client',
        'http://localhost/callback',
        'openid',
        '',
        '',
        '',
        '',
        req,
      );
      expect(result.url).toContain('code=auth-code-xyz');
      expect(result.url).not.toContain('state=');
    });

    it('should return error URL on service failure (with state)', async () => {
      mockCallbackFlow(new Error('code generation failed'));
      const req: any = { user: { id: 42 } };
      const result = await controller.oauth2AuthorizeCallback(
        'my-client',
        'http://localhost/callback',
        'openid',
        'state-val',
        '',
        '',
        '',
        req,
      );
      expect(result.url).toContain('error=server_error');
      expect(result.url).toContain('state=state-val');
    });

    it('should return error URL on service failure (without state)', async () => {
      mockCallbackFlow(new Error('code generation failed'));
      const req: any = { user: { id: 42 } };
      const result = await controller.oauth2AuthorizeCallback(
        'my-client',
        'http://localhost/callback',
        'openid',
        '',
        '',
        '',
        '',
        req,
      );
      expect(result.url).toContain('error=server_error');
      expect(result.url).not.toContain('state=');
    });

    it('should reject a redirect_uri the client is not allowed to use', async () => {
      mockCallbackFlow({ code: 'auth-code-xyz' }, { valid: false });
      const req: any = { user: { id: 42 } };

      await expect(
        controller.oauth2AuthorizeCallback(
          'my-client',
          'https://attacker.example/steal',
          'openid',
          'state123',
          '',
          '',
          '',
          req,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not mint a code when validation fails', async () => {
      mockCallbackFlow({ code: 'auth-code-xyz' }, { valid: false });
      const req: any = { user: { id: 42 } };

      await expect(
        controller.oauth2AuthorizeCallback(
          'my-client',
          'https://attacker.example/steal',
          'openid',
          '',
          '',
          '',
          '',
          req,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockClientProxy.send).not.toHaveBeenCalledWith(
        { cmd: 'oauth2_generate_code' },
        expect.anything(),
      );
    });

    it('should surface a validation error instead of redirecting to the URL', async () => {
      mockClientProxy.send.mockImplementation((pattern: { cmd: string }) => {
        if (pattern.cmd === 'oauth2_validate_authorize') {
          return throwError(() => new Error('Invalid redirect_uri'));
        }
        return of({ code: 'auth-code-xyz' });
      });
      const req: any = { user: { id: 42 } };

      await expect(
        controller.oauth2AuthorizeCallback(
          'my-client',
          'https://attacker.example/steal',
          'openid',
          '',
          '',
          '',
          '',
          req,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('oauth2UserInfo', () => {
    it('should return user info for authenticated user', async () => {
      const userInfo = { sub: '42', email: 'user@example.com', name: 'User' };
      mockClientProxy.send.mockReturnValue(of(userInfo));
      const req: any = { user: { id: 42 } };
      const result = await controller.oauth2UserInfo(req);
      expect(result).toEqual(userInfo);
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'oauth2_userinfo' },
        { user_id: 42 },
      );
    });

    it('should throw UnauthorizedException on service error', async () => {
      mockClientProxy.send.mockReturnValue(
        throwError(() => new Error('token expired')),
      );
      const req: any = { user: { id: 42 } };
      await expect(controller.oauth2UserInfo(req)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
