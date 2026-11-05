/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';
import { RoleCacheService } from 'src/roles/role-cache.service';
import { mockAuthService } from 'src/auth/__test__/mocks/auth-service.mock';

describe('UsersController', () => {
  let controller: UsersController;
  let userService: ClientProxy;

  const mockClientProxy = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: 'USER_SERVICE', useValue: mockClientProxy },
        mockAuthService(),
        {
          provide: RoleCacheService,
          useValue: {
            getRoles: jest.fn(),
            // add other mocked methods if needed
          },
        },
      ],
    }).compile();
    controller = module.get<UsersController>(UsersController);
    userService = module.get('USER_SERVICE');
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register user', async () => {
    const body = { email: 'a', password: 'b', profile: {} };
    mockClientProxy.send.mockReturnValue(of({ success: true }));
    const result = await controller.register(body);
    expect(result).toEqual({ success: true });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'register_user' },
      { ...body, locale: 'en' },
    );
  });

  it('should throw on register error', async () => {
    const body = { email: 'a', password: 'b', profile: {} };
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.register(body)).rejects.toThrow(HttpException);
  });

  it('should confirm account', async () => {
    mockClientProxy.send.mockReturnValue(of({ confirmed: true }));
    const result = await controller.confirmAccount('token123');
    expect(result).toEqual({ confirmed: true });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'confirm_account' },
      { token: 'token123' },
    );
  });

  it('should throw on confirm account error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.confirmAccount('token123')).rejects.toThrow(
      HttpException,
    );
  });

  it('should reset password (POST /reset-password/:token)', async () => {
    const body = { newPassword: '123', email: 'a' };
    mockClientProxy.send.mockReturnValue(of({ reset: true }));
    const result = await controller.resetPasswordPost('token', body);
    expect(result).toEqual({ reset: true });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'reset_password' },
      { ...body, resetToken: 'token' },
    );
  });

  it('should throw on reset password error', async () => {
    const body = { newPassword: '123', email: 'a' };
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.resetPasswordPost('token', body)).rejects.toThrow(
      HttpException,
    );
  });

  it('should request reset password', async () => {
    const body = { email: 'a' };
    mockClientProxy.send.mockReturnValue(of({ sent: true }));
    const result = await controller.resetPasswordRequestPost(body);
    expect(result).toEqual({ sent: true });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'reset_password_request' },
      { ...body, locale: 'en' },
    );
  });

  it('should throw on reset password request error', async () => {
    const body = { email: 'a' };
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.resetPasswordRequestPost(body)).rejects.toThrow(
      HttpException,
    );
  });

  it('should reset password (POST /reset-password)', async () => {
    const body = { email: 'a', newPassword: '123', resetToken: 't' };
    mockClientProxy.send.mockReturnValue(of({ reset: true }));
    const result = await controller.resetPassword(body);
    expect(result).toEqual({ reset: true });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'reset_password' },
      body,
    );
  });

  it('should throw on reset password (POST /reset-password) error', async () => {
    const body = { email: 'a', newPassword: '123', resetToken: 't' };
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.resetPassword(body)).rejects.toThrow(HttpException);
  });

  it('should get user profile', async () => {
    const req = { user: { email: 'a' } };
    mockClientProxy.send.mockReturnValue(of({ profile: true }));
    const result = await controller.getProfile(req);
    expect(result).toEqual({ profile: true });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'get_user_profile' },
      { email: 'a' },
    );
  });

  it('should throw on get user profile error', async () => {
    const req = { user: { email: 'a' } };
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.getProfile(req)).rejects.toThrow(HttpException);
  });

  it('should get all users', async () => {
    mockClientProxy.send.mockReturnValue(of([{ id: 1 }]));
    const result = await controller.getAllUsers();
    expect(result).toEqual([{ id: 1 }]);
    expect(mockClientProxy.send).toHaveBeenCalledWith({ cmd: 'get_users' }, {});
  });

  it('should throw on get all users error', async () => {
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.getAllUsers()).rejects.toThrow(HttpException);
  });

  it('should update profile', async () => {
    const req = { user: { id: 1 } };
    const body = { profile: { firstName: 'n' } };
    mockClientProxy.send.mockReturnValue(of({ updated: true }));
    const result = await controller.updateProfile(req, body);
    expect(result).toEqual({ updated: true });
    expect(mockClientProxy.send).toHaveBeenCalledWith(
      { cmd: 'update_profile' },
      { userId: 1, profile: { firstName: 'n' } },
    );
  });

  it('should throw on update profile error', async () => {
    const req = { user: { id: 1 } };
    const body = { profile: { firstName: 'n' } };
    mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
    await expect(controller.updateProfile(req, body)).rejects.toThrow(
      HttpException,
    );
  });

  describe('repairer profile endpoints', () => {
    it('should get repairer profile', async () => {
      const req = { user: { id: 42 } };
      mockClientProxy.send.mockReturnValue(of({ businessName: 'Fix & Go' }));
      const result = await controller.getRepairerProfile(req);
      expect(result).toEqual({ businessName: 'Fix & Go' });
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'get_repairer_profile' },
        { userId: 42 },
      );
    });

    it('should throw 404 when repairer profile is null', async () => {
      const req = { user: { id: 42 } };
      mockClientProxy.send.mockReturnValue(of(null));
      await expect(controller.getRepairerProfile(req)).rejects.toThrow(
        HttpException,
      );
      await expect(controller.getRepairerProfile(req)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('should throw on get repairer profile error', async () => {
      const req = { user: { id: 42 } };
      mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
      await expect(controller.getRepairerProfile(req)).rejects.toThrow(
        HttpException,
      );
    });

    it('should create repairer profile', async () => {
      const req = { user: { id: 42 } };
      const body = { businessName: 'Fix & Go', city: 'Brussels' };
      mockClientProxy.send.mockReturnValue(of({ id: 1, ...body }));
      const result = await controller.createRepairerProfile(req, body);
      expect(result).toMatchObject(body);
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'create_repairer_profile' },
        { userId: 42, profile: body },
      );
    });

    it('should forward deviceSpecialties as English keys when creating repairer profile', async () => {
      const req = { user: { id: 42 } };
      const specialties = ['Smartphones', 'Laptops', 'Washing machines'];
      const body = { businessName: 'TechFix', deviceSpecialties: specialties };
      mockClientProxy.send.mockReturnValue(of({ id: 1, ...body }));
      const result = await controller.createRepairerProfile(req, body);
      expect(result.deviceSpecialties).toEqual(specialties);
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'create_repairer_profile' },
        {
          userId: 42,
          profile: expect.objectContaining({ deviceSpecialties: specialties }),
        },
      );
    });

    it('should throw on create repairer profile error', async () => {
      const req = { user: { id: 42 } };
      mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
      await expect(controller.createRepairerProfile(req, {})).rejects.toThrow(
        HttpException,
      );
    });

    it('should update repairer profile', async () => {
      const req = { user: { id: 42 } };
      const body = { city: 'Ghent' };
      mockClientProxy.send.mockReturnValue(of({ id: 1, ...body }));
      const result = await controller.updateRepairerProfile(req, body);
      expect(result).toMatchObject(body);
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'update_repairer_profile' },
        { userId: 42, profile: body },
      );
    });

    it('should forward deviceSpecialties as English keys when updating repairer profile', async () => {
      const req = { user: { id: 42 } };
      const specialties = ['Tablets', 'Game consoles', 'Bicycles / E-bikes'];
      const body = { deviceSpecialties: specialties };
      mockClientProxy.send.mockReturnValue(of({ id: 1, ...body }));
      const result = await controller.updateRepairerProfile(req, body);
      expect(result.deviceSpecialties).toEqual(specialties);
      expect(mockClientProxy.send).toHaveBeenCalledWith(
        { cmd: 'update_repairer_profile' },
        {
          userId: 42,
          profile: expect.objectContaining({ deviceSpecialties: specialties }),
        },
      );
    });

    it('should throw on update repairer profile error', async () => {
      const req = { user: { id: 42 } };
      mockClientProxy.send.mockReturnValue(throwError(() => new Error('fail')));
      await expect(controller.updateRepairerProfile(req, {})).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('error fallback – no message (covers || default branch)', () => {
    it('register uses default message when error has no message', async () => {
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(
        controller.register({ email: 'a', password: 'b', profile: {} } as any),
      ).rejects.toThrow('Failed to register user');
    });

    it('confirmAccount uses default message when error has no message', async () => {
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(controller.confirmAccount('token')).rejects.toThrow(
        'Failed to confirm account',
      );
    });

    it('resetPasswordPost uses default message when error has no message', async () => {
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(
        controller.resetPasswordPost('t', {
          newPassword: '1',
          email: 'a',
        } as any),
      ).rejects.toThrow('Failed to reset password');
    });

    it('resetPasswordRequestPost uses default message when error has no message', async () => {
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(
        controller.resetPasswordRequestPost({ email: 'a' } as any),
      ).rejects.toThrow('Failed to send reset password email');
    });

    it('resetPassword uses default message when error has no message', async () => {
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(
        controller.resetPassword({
          email: 'a',
          newPassword: '1',
          resetToken: 't',
        } as any),
      ).rejects.toThrow('Failed to reset password');
    });

    it('getProfile uses default message when error has no message', async () => {
      const req = { user: { email: 'a' } };
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(controller.getProfile(req)).rejects.toThrow(
        'Failed to get user profile',
      );
    });

    it('getAllUsers uses default message when error has no message', async () => {
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(controller.getAllUsers()).rejects.toThrow(
        'Failed to get users',
      );
    });

    it('updateProfile uses default message when error has no message', async () => {
      const req = { user: { id: 1 } };
      const body = { profile: { firstName: 'n' } };
      mockClientProxy.send.mockReturnValue(throwError(() => ({})));
      await expect(controller.updateProfile(req, body)).rejects.toThrow(
        'Failed to update profile',
      );
    });
  });
});
