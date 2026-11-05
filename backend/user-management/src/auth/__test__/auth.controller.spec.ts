/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { RpcException } from '@nestjs/microservices';
import { RecaptchaService } from '../../recaptcha/recaptcha.service';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    findUserByEmail: jest.fn(),
    refreshSession: jest.fn(),
    logout: jest.fn(),
  };

  const mockRecaptchaService = {
    verify: jest.fn(),
  };

  beforeEach(async () => {
    // Ensure controller runs recaptcha verification path deterministically
    process.env.RECAPTCHA_SECRET =
      process.env.RECAPTCHA_SECRET || 'test_recap_secret';
    mockRecaptchaService.verify.mockResolvedValue({
      success: true,
      score: 0.9,
    });
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: RecaptchaService,
          useValue: mockRecaptchaService,
        },
      ],
    }).compile();

    authController = moduleRef.get<AuthController>(AuthController);
    authService = moduleRef.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // cleanup env
    delete process.env.RECAPTCHA_SECRET;
  });

  describe('login', () => {
    it('should return token if login succeeds', async () => {
      const user = { id: 1, email: 'test@test.com' };
      const result = { access_token: 'abc123' };

      mockAuthService.validateUser.mockResolvedValue(user);
      mockAuthService.login.mockReturnValue(result);

      const response = await authController.login({
        email: 'test@test.com',
        password: 'password',
      });

      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        'test@test.com',
        'password',
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(user);
      expect(response).toEqual(result);
    });

    it('should throw RpcException if validateUser fails', async () => {
      mockAuthService.validateUser.mockRejectedValue(new Error('Invalid user'));

      await expect(
        authController.login({ email: 'fail@test.com', password: 'wrong' }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('refresh', () => {
    it('should exchange a refresh token for a new session', async () => {
      const result = {
        access_token: 'new_token',
        refresh_token: 'rotated',
        user: { id: 1, email: 'test@test.com' },
      };
      mockAuthService.refreshSession.mockResolvedValue(result);

      const response = await authController.refresh({
        refresh_token: 'presented',
      });

      expect(mockAuthService.refreshSession).toHaveBeenCalledWith('presented');
      expect(response).toEqual(result);
    });

    it('should throw RpcException if the refresh token is rejected', async () => {
      mockAuthService.refreshSession.mockRejectedValue(
        new Error('Invalid refresh token'),
      );

      await expect(
        authController.refresh({ refresh_token: 'stolen' }),
      ).rejects.toThrow(RpcException);
    });

    it('should not accept an email in place of a refresh token', async () => {
      mockAuthService.refreshSession.mockRejectedValue(
        new Error('Invalid refresh token'),
      );

      await expect(
        authController.refresh({ email: 'victim@test.com' } as never),
      ).rejects.toThrow(RpcException);
      expect(mockAuthService.refreshSession).toHaveBeenCalledWith(undefined);
    });
  });

  describe('logout', () => {
    it('should revoke the presented refresh token', async () => {
      mockAuthService.logout.mockResolvedValue({ success: true });

      const response = await authController.logout({
        refresh_token: 'presented',
      });

      expect(mockAuthService.logout).toHaveBeenCalledWith('presented');
      expect(response).toEqual({ success: true });
    });
  });
});
