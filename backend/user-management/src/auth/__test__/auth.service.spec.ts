/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-require-imports */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UserService } from '../../users/user.service';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import { RefreshTokenService } from '../refresh-token.service';

const mockUserService = () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
});
const mockJwtService = () => ({
  sign: jest.fn(),
});
const mockRefreshTokenService = () => ({
  issue: jest.fn(),
  rotate: jest.fn(),
  revoke: jest.fn(),
  revokeAllForUser: jest.fn(),
});

describe('AuthService', () => {
  let service: AuthService;
  let userService: ReturnType<typeof mockUserService>;
  let jwtService: ReturnType<typeof mockJwtService>;
  let refreshTokenService: ReturnType<typeof mockRefreshTokenService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useFactory: mockUserService },
        { provide: JwtService, useFactory: mockJwtService },
        {
          provide: RefreshTokenService,
          useFactory: mockRefreshTokenService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
    refreshTokenService = module.get(RefreshTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid and verified', async () => {
      const user = {
        email: 'test@mail.com',
        password: 'hashed',
        isVerified: true,
      };
      userService.findByEmail.mockResolvedValue(user);
      jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true);

      const result = await service.validateUser('test@mail.com', 'password');
      expect(userService.findByEmail).toHaveBeenCalledWith('test@mail.com');
      expect(result).toEqual(user);
    });

    it('should throw if user is not verified', async () => {
      const user = {
        email: 'test@mail.com',
        password: 'hashed',
        isVerified: false,
      };
      userService.findByEmail.mockResolvedValue(user);
      jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true);

      await expect(
        service.validateUser('test@mail.com', 'password'),
      ).rejects.toThrow(RpcException);
    });

    it('should throw if credentials are invalid', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('test@mail.com', 'password'),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('login', () => {
    it('should return access_token, refresh_token and a user without secrets', async () => {
      const user = {
        email: 'test@mail.com',
        role: 'ADMIN',
        id: 1,
        password: '$2a$10$hash',
        resetToken: 'reset',
        confirmationToken: 'confirm',
      };
      jwtService.sign.mockReturnValue('token');
      refreshTokenService.issue.mockResolvedValue('refresh');

      const result = await service.login(user as any);

      expect(jwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        role: user.role,
        id: user.id,
      });
      expect(refreshTokenService.issue).toHaveBeenCalledWith(1);
      expect(result.access_token).toBe('token');
      expect(result.refresh_token).toBe('refresh');
      expect(result.user).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('resetToken');
      expect(result.user).not.toHaveProperty('confirmationToken');
      expect(result.user).toMatchObject({ id: 1, email: 'test@mail.com' });
    });
  });

  describe('refreshSession', () => {
    it('should rotate the token and issue a new access token', async () => {
      const user = { email: 'test@mail.com', role: 'ADMIN', id: 1 };
      refreshTokenService.rotate.mockResolvedValue({
        userId: 1,
        refreshToken: 'rotated',
      });
      userService.findById.mockResolvedValue(user);
      jwtService.sign.mockReturnValue('newtoken');

      const result = await service.refreshSession('presented');

      expect(refreshTokenService.rotate).toHaveBeenCalledWith('presented');
      expect(userService.findById).toHaveBeenCalledWith(1);
      expect(result.access_token).toBe('newtoken');
      expect(result.refresh_token).toBe('rotated');
    });

    it('should propagate rejection of an invalid token', async () => {
      refreshTokenService.rotate.mockRejectedValue(
        new RpcException('Invalid refresh token'),
      );

      await expect(service.refreshSession('stolen')).rejects.toThrow(
        RpcException,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw if the token points at a deleted user', async () => {
      refreshTokenService.rotate.mockResolvedValue({
        userId: 99,
        refreshToken: 'rotated',
      });
      userService.findById.mockResolvedValue(null);

      await expect(service.refreshSession('presented')).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      const result = await service.logout('presented');

      expect(refreshTokenService.revoke).toHaveBeenCalledWith('presented');
      expect(result).toEqual({ success: true });
    });
  });

  describe('findUserByEmail', () => {
    it('should return user if found', async () => {
      const user = { email: 'test@mail.com' };
      userService.findByEmail.mockResolvedValue(user);

      const result = await service.findUserByEmail('test@mail.com');
      expect(result).toEqual(user);
    });

    it('should throw if user not found', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(
        service.findUserByEmail('notfound@mail.com'),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('resetPassword', () => {
    it('should store the new password hashed, never in clear text', async () => {
      const user = { email: 'test@mail.com', password: 'old' };
      userService.findByEmail.mockResolvedValue(user);
      userService.update.mockResolvedValue(user);

      await service.resetPassword('test@mail.com', 'new');

      expect(userService.findByEmail).toHaveBeenCalledWith('test@mail.com');
      const saved = userService.update.mock.calls[0][0] as {
        password: string;
      };
      expect(saved.password).not.toBe('new');
      expect(saved.password).toMatch(/^\$2[aby]\$/);
    });

    it('should throw if user not found', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(
        service.resetPassword('notfound@mail.com', 'new'),
      ).rejects.toThrow(RpcException);
    });
  });
});
