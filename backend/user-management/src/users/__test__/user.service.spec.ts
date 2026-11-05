/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user.entity';
import { UserProfile } from '../../user-profile/user-profile.entity';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { RecaptchaService } from '../../recaptcha/recaptcha.service';
import { RefreshTokenService } from '../../auth/refresh-token.service';

const mockUserRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
});

const mockProfileRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
});

const mockClientProxy = () => ({
  emit: jest.fn(),
});

const mockConfigService = () => ({
  get: jest.fn((_key: string) => 'http://mock-frontend.com'),
});

const mockRefreshTokenService = () => ({
  issue: jest.fn(),
  rotate: jest.fn(),
  revoke: jest.fn(),
  revokeAllForUser: jest.fn(),
});

describe('UserService', () => {
  let service: UserService;
  let userRepository: ReturnType<typeof mockUserRepository>;
  let profileRepository: ReturnType<typeof mockProfileRepository>;
  let notificationsClient: ReturnType<typeof mockClientProxy>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
        {
          provide: getRepositoryToken(UserProfile),
          useFactory: mockProfileRepository,
        },
        { provide: 'NOTIFICATIONS_SERVICE', useFactory: mockClientProxy },
        { provide: ConfigService, useFactory: mockConfigService },
        {
          provide: RefreshTokenService,
          useFactory: mockRefreshTokenService,
        },
        {
          provide: RecaptchaService,
          useValue: {
            verify: jest.fn().mockResolvedValue({ success: true, score: 1 }),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
    profileRepository = module.get(getRepositoryToken(UserProfile));
    notificationsClient = module.get('NOTIFICATIONS_SERVICE');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should hash password, create user and return it', async () => {
      const mockEmail = 'test@mail.com';
      const mockPassword = 'plainpassword';
      const mockRole = { id: 1, name: 'USER' } as any;
      const mockProfileData = { firstName: 'John' };
      const mockToken = 'token123';
      const mockHashedPassword: any = await bcrypt.hash(mockPassword, 10);
      const mockProfile = { id: 1, firstName: 'John' };
      const mockUser = {
        id: 1,
        email: mockEmail,
        password: mockHashedPassword,
        profile: mockProfile,
      };

      jest
        .spyOn<typeof bcrypt, 'hash'>(bcrypt, 'hash')
        .mockReturnValueOnce(mockHashedPassword);
      profileRepository.create.mockReturnValue(mockProfile);
      profileRepository.save.mockResolvedValue(mockProfile);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(
        mockEmail,
        mockPassword,
        mockRole,
        mockProfileData,
        mockToken,
        false,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10);
      expect(result).toEqual(mockUser);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isVerified: false,
          confirmationToken: mockToken,
        }),
      );
    });

    it('should create a social user with isVerified true and null confirmationToken', async () => {
      const mockEmail = 'social@mail.com';
      const mockPassword = 'randompassword';
      const mockRole = { id: 1, name: 'USER' } as any;
      const mockProfileData = { firstName: 'Social' };
      const mockHashedPassword: any = await bcrypt.hash(mockPassword, 10);
      const mockProfile = { id: 1, firstName: 'Social' };
      const mockUser = {
        id: 2,
        email: mockEmail,
        password: mockHashedPassword,
        profile: mockProfile,
      };

      jest
        .spyOn<typeof bcrypt, 'hash'>(bcrypt, 'hash')
        .mockReturnValueOnce(mockHashedPassword);
      profileRepository.create.mockReturnValue(mockProfile);
      profileRepository.save.mockResolvedValue(mockProfile);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(
        mockEmail,
        mockPassword,
        mockRole,
        mockProfileData,
        null,
        true,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10);
      expect(result).toEqual(mockUser);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isVerified: true,
          confirmationToken: null,
        }),
      );
    });
  });

  describe('sendConfirmationEmail', () => {
    it('should call emit on the notificationsClient', () => {
      const email = 'user@example.com';
      const token = 'abc123';
      service.sendConfirmationEmail(email, token);

      expect(notificationsClient.emit).toHaveBeenCalledWith(
        { cmd: 'send_email' },
        expect.objectContaining({ to: email, subject: expect.any(String) }),
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user with profile if found', async () => {
      const mockUser = { id: 1, email: 'test@mail.com', profile: {} };
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@mail.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@mail.com' },
        relations: ['profile'],
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findById', () => {
    it('should return user with profile if found', async () => {
      const mockUser = { id: 1, email: 'test@mail.com', profile: {} };
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['profile'],
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['profile'],
      });
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all users with their profiles', async () => {
      const users = [
        { id: 1, profile: {} },
        { id: 2, profile: {} },
      ];
      userRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(userRepository.find).toHaveBeenCalledWith({
        relations: ['profile'],
      });
      expect(result).toEqual(users);
    });
  });

  describe('findByToken', () => {
    it('should return user with matching token', async () => {
      const user = { id: 1, confirmationToken: 'abc123' };
      userRepository.findOne.mockResolvedValue(user);

      const result = await service.findByToken('abc123');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { confirmationToken: 'abc123' },
      });
      expect(result).toEqual(user);
    });
  });

  describe('update', () => {
    it('should save and return updated user', async () => {
      const user: any = { id: 1, email: 'updated@mail.com' };
      userRepository.save.mockResolvedValue(user);

      const result = await service.update(user);

      expect(userRepository.save).toHaveBeenCalledWith(user);
      expect(result).toEqual(user);
    });
  });

  describe('findByEmail', () => {
    it('should return user with profile if found', async () => {
      const mockUser = { id: 1, email: 'test@mail.com', profile: {} };
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@mail.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@mail.com' },
        relations: ['profile'],
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('resetPassword', () => {
    it('should hash new password and update user if token matches', async () => {
      const email = 'user@example.com';
      const resetToken = 'validtoken';
      const newPassword = 'newPassword123';
      const mockUser = { id: 1, email, resetToken, password: '' };

      userRepository.findOne.mockResolvedValue(mockUser);
      const hashed: any = await bcrypt.hash(newPassword, 10);
      jest
        .spyOn<typeof bcrypt, 'hash'>(bcrypt, 'hash')
        .mockReturnValueOnce(hashed);
      userRepository.save.mockResolvedValue({ ...mockUser, password: hashed });

      await service.resetPassword(email, newPassword, resetToken);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(userRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        password: hashed,
      });
    });

    it('should throw if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword('unknown@mail.com', 'pwd', 'token'),
      ).rejects.toThrow('User not found');
    });

    it('should throw if reset token is invalid', async () => {
      const mockUser = { id: 1, email: 'a@b.com', resetToken: 'correct' };
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.resetPassword('a@b.com', 'pwd', 'wrong'),
      ).rejects.toThrow('Invalid reset token');
    });
  });

  describe('updateProfile', () => {
    it('should update and return the user profile', async () => {
      const userId = 1;
      const existingProfile = {
        id: 10,
        user: { id: userId },
        firstName: 'Old',
        lastName: 'Name',
      };
      const updatedData = { firstName: 'New', lastName: 'Name' };
      const savedProfile = { ...existingProfile, ...updatedData };

      profileRepository.findOne.mockResolvedValue(existingProfile);
      profileRepository.save.mockResolvedValue(savedProfile);

      const result = await service.updateProfile(userId, updatedData);

      expect(profileRepository.findOne).toHaveBeenCalledWith({
        where: { user: { id: userId } },
        relations: ['user'],
      });
      expect(profileRepository.save).toHaveBeenCalledWith({
        ...existingProfile,
        ...updatedData,
      });
      expect(result).toEqual(savedProfile);
    });

    it('saves only the fields a user may change, never an id or a user', async () => {
      const existingProfile = { id: 10, user: { id: 1 }, firstName: 'Old' };
      profileRepository.findOne.mockResolvedValue(existingProfile);
      profileRepository.save.mockImplementation(async (p: object) => p);

      await service.updateProfile(1, {
        id: 7,
        user: { id: 2 },
        firstName: 'New',
        onboardingCompleted: true,
      } as never);

      expect(profileRepository.save).toHaveBeenCalledWith({
        id: 10,
        user: { id: 1 },
        firstName: 'New',
        onboardingCompleted: true,
      });
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      profileRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile(99, { firstName: 'Test' }),
      ).rejects.toThrow(`User profile for user ID 99 not found`);
    });
  });
});
