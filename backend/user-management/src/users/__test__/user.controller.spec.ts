/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import { RoleService } from '../../roles/role.service';
import { RpcException } from '@nestjs/microservices';
import { RecaptchaService } from '../../recaptcha/recaptcha.service';

describe('UserController', () => {
  let controller: UserController;
  let userService: Partial<Record<keyof UserService, jest.Mock>>;
  let roleService: Partial<Record<keyof RoleService, jest.Mock>>;

  beforeEach(async () => {
    userService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      sendConfirmationEmail: jest.fn(),
      findByToken: jest.fn(),
      update: jest.fn(),
      sendResetPasswordEmail: jest.fn(),
      resetPassword: jest.fn(),
      findAll: jest.fn(),
      updateProfile: jest.fn(),
    };

    roleService = {
      findByName: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: RoleService, useValue: roleService },
        {
          provide: RecaptchaService,
          useValue: {
            verify: jest.fn().mockResolvedValue({ success: true, score: 1 }),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  describe('findUserByEmail', () => {
    it('should return user by email', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      userService.findByEmail?.mockResolvedValue(mockUser);
      const result = await controller.findUserByEmail('test@example.com');
      expect(result).toEqual(mockUser);
      expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('findUserById', () => {
    it('should return user by id', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      userService.findById?.mockResolvedValue(mockUser);
      const result = await controller.findUserById(1);
      expect(result).toEqual(mockUser);
      expect(userService.findById).toHaveBeenCalledWith(1);
    });

    it('should return null if user not found', async () => {
      userService.findById?.mockResolvedValue(null);
      const result = await controller.findUserById(999);
      expect(result).toBeNull();
      expect(userService.findById).toHaveBeenCalledWith(999);
    });
  });

  describe('createUser', () => {
    it('should create a new user and send confirmation email if not social', async () => {
      const mockRole = { id: 1, name: 'user' };
      const mockUser = { id: 1, email: 'new@example.com' };
      roleService.findByName?.mockResolvedValue(mockRole);
      userService.create?.mockResolvedValue(mockUser);
      userService.sendConfirmationEmail?.mockResolvedValue(undefined);

      const result = await controller.createUser({
        email: 'new@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        isSocial: false,
      });

      expect(roleService.findByName).toHaveBeenCalledWith('user');
      expect(userService.create).toHaveBeenCalledWith(
        'new@example.com',
        'password123',
        mockRole,
        { firstName: 'John', lastName: 'Doe' },
        expect.any(String),
        false,
      );
      expect(userService.sendConfirmationEmail).toHaveBeenCalledWith(
        'new@example.com',
        expect.any(String),
      );
      expect(result).toEqual({
        user: mockUser,
        message: 'User created successfully',
      });
    });

    it('should create a new social user and not send confirmation email', async () => {
      const mockRole = { id: 1, name: 'user' };
      const mockUser = { id: 1, email: 'social@example.com' };
      roleService.findByName?.mockResolvedValue(mockRole);
      userService.create?.mockResolvedValue(mockUser);
      userService.sendConfirmationEmail?.mockResolvedValue(undefined);

      const result = await controller.createUser({
        email: 'social@example.com',
        password: 'randompassword',
        firstName: 'Jane',
        lastName: 'Doe',
        isSocial: true,
      });

      expect(roleService.findByName).toHaveBeenCalledWith('user');
      expect(userService.create).toHaveBeenCalledWith(
        'social@example.com',
        'randompassword',
        mockRole,
        { firstName: 'Jane', lastName: 'Doe' },
        null,
        true,
      );
      expect(userService.sendConfirmationEmail).not.toHaveBeenCalled();
      expect(result).toEqual({
        user: mockUser,
        message: 'User created successfully',
      });
    });

    it('should throw RpcException if default role not found', async () => {
      roleService.findByName?.mockResolvedValue(null);

      await expect(
        controller.createUser({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('register', () => {
    it('should throw if email is missing', async () => {
      await expect(
        controller.register({
          email: '',
          password: 'Test@1234',
          userType: 'customer',
          profile: {},
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw if password is missing', async () => {
      await expect(
        controller.register({
          email: 'test@test.com',
          password: '',
          userType: 'customer',
          profile: {},
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw if password is weak', async () => {
      await expect(
        controller.register({
          email: 'test@test.com',
          password: '123',
          userType: 'customer',
          profile: {},
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw if user already exists', async () => {
      userService.findByEmail?.mockResolvedValue({ email: 'test@test.com' });
      await expect(
        controller.register({
          email: 'test@test.com',
          password: 'Strong@1234',
          userType: 'customer',
          profile: {},
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw if password is less than 8 characters', async () => {
      userService.findByEmail?.mockResolvedValue(null);
      await expect(
        controller.register({
          email: 'test@test.com',
          password: 'Abc@12',
          userType: 'customer',
          profile: {},
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw if password missing uppercase', async () => {
      userService.findByEmail?.mockResolvedValue(null);
      await expect(
        controller.register({
          email: 'test@test.com',
          password: 'strong@1234',
          userType: 'customer',
          profile: {},
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw if password missing lowercase', async () => {
      userService.findByEmail?.mockResolvedValue(null);
      await expect(
        controller.register({
          email: 'test@test.com',
          password: 'STRONG@1234',
          userType: 'customer',
          profile: {},
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw if password missing number', async () => {
      userService.findByEmail?.mockResolvedValue(null);
      await expect(
        controller.register({
          email: 'test@test.com',
          password: 'Strong@abcd',
          userType: 'customer',
          profile: {},
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw if password missing special character', async () => {
      userService.findByEmail?.mockResolvedValue(null);
      await expect(
        controller.register({
          email: 'test@test.com',
          password: 'Strong1234',
          userType: 'customer',
          profile: {},
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw if role not found (both user and fallback missing)', async () => {
      userService.findByEmail?.mockResolvedValue(null);
      roleService.findByName
        ?.mockResolvedValueOnce(null) // 'user' not found
        .mockResolvedValueOnce(null); // fallback 'user' not found
      await expect(
        controller.register({
          email: 'test@test.com',
          password: 'Strong@1234',
          userType: 'customer',
          profile: {},
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should create customer user with role user when userType is customer', async () => {
      userService.findByEmail?.mockResolvedValue(null);
      roleService.findByName?.mockResolvedValue({ name: 'user' });
      userService.create?.mockResolvedValue({ id: 1, email: 'test@test.com' });
      userService.sendConfirmationEmail?.mockResolvedValue(undefined);

      const result = await controller.register({
        email: 'test@test.com',
        password: 'Strong@1234',
        userType: 'customer',
        profile: {},
      });

      expect(roleService.findByName).toHaveBeenCalledWith('user');
      expect(result).toHaveProperty('user');
    });

    it('should create repairer user with role repairer when userType is repairer', async () => {
      userService.findByEmail?.mockResolvedValue(null);
      roleService.findByName?.mockResolvedValue({ name: 'repairer' });
      userService.create?.mockResolvedValue({
        id: 2,
        email: 'repairer@test.com',
      });
      userService.sendConfirmationEmail?.mockResolvedValue(undefined);

      const result = await controller.register({
        email: 'repairer@test.com',
        password: 'Strong@1234',
        userType: 'repairer',
        profile: {},
      });

      expect(roleService.findByName).toHaveBeenCalledWith('repairer');
      expect(result).toHaveProperty('user');
    });

    it('should default to user role when userType is not provided', async () => {
      userService.findByEmail?.mockResolvedValue(null);
      roleService.findByName?.mockResolvedValue({ name: 'user' });
      userService.create?.mockResolvedValue({
        id: 3,
        email: 'default@test.com',
      });
      userService.sendConfirmationEmail?.mockResolvedValue(undefined);

      await controller.register({
        email: 'default@test.com',
        password: 'Strong@1234',
        profile: {},
      });

      expect(roleService.findByName).toHaveBeenCalledWith('user');
    });
  });

  describe('confirmAccount', () => {
    it('should confirm account with valid token', async () => {
      const user = { confirmationToken: 'token', isVerified: false };
      userService.findByToken?.mockResolvedValue(user);
      userService.update?.mockResolvedValue({ ...user, isVerified: true });

      const result = await controller.confirmAccount({ token: 'token' });
      expect(result).toEqual({
        message:
          'Your account has been successfully activated. You can now log in.',
      });
    });

    it('should throw if token is invalid', async () => {
      userService.findByToken?.mockResolvedValue(null);
      await expect(
        controller.confirmAccount({ token: 'badtoken' }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('resetPasswordRequest', () => {
    it('should send email if user exists', async () => {
      const user = { email: 'test@test.com' };
      userService.findByEmail?.mockResolvedValue(user);
      userService.update?.mockResolvedValue(user);
      userService.sendResetPasswordEmail?.mockResolvedValue(undefined);

      const result = await controller.resetPasswordRequest({
        email: 'test@test.com',
      });
      expect(result).toEqual({ message: 'Reset password email sent' });
    });

    it('should throw if user not found', async () => {
      userService.findByEmail?.mockResolvedValue(null);
      await expect(
        controller.resetPasswordRequest({ email: 'none@test.com' }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('resetPassword', () => {
    it('should throw if password is weak', async () => {
      await expect(
        controller.resetPassword({
          email: 'test@test.com',
          newPassword: '123',
          resetToken: 'abc',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should reset password if valid', async () => {
      userService.resetPassword?.mockResolvedValue(undefined);

      const result = await controller.resetPassword({
        email: 'test@test.com',
        newPassword: 'Strong@1234',
        resetToken: 'abc',
      });

      expect(result).toEqual({ message: 'Password reset successfully' });
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const user = { email: 'test@test.com' };
      userService.findByEmail?.mockResolvedValue(user);

      const result = await controller.getProfile({ email: 'test@test.com' });
      expect(result).toEqual(user);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const users = [{ id: 1 }, { id: 2 }];
      userService.findAll?.mockResolvedValue(users);

      const result = await controller.getAllUsers();
      expect(result).toEqual(users);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const profile: any = { firstName: 'John' };
      const userId = 1;
      userService.updateProfile?.mockResolvedValue({ userId, ...profile });

      const result = await controller.updateProfile({ userId, profile });
      expect(result).toEqual({ userId, ...profile });
    });
  });
});
