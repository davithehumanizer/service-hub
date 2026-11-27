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
import { of, throwError } from 'rxjs';

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
  send: jest.fn(() => of({ success: true })),
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

  describe('createContributor', () => {
    it('opens a verified account whose password is chosen from the link sent', async () => {
      const role = { id: 5, name: 'contributor' } as any;
      profileRepository.create.mockImplementation((p) => p);
      profileRepository.save.mockImplementation(async (p) => ({ id: 3, ...p }));
      userRepository.create.mockImplementation((u) => u);
      userRepository.save.mockImplementation(async (u) => ({ id: 9, ...u }));

      const { user, invitationSent }: any = await service.createContributor(
        'saisie@acme.example',
        role,
        { firstName: 'Ana' },
        'de',
      );

      expect(invitationSent).toBe(true);
      expect(user).toMatchObject({
        email: 'saisie@acme.example',
        role,
        isVerified: true,
        confirmationToken: null,
        // The invitation's language is the account's, for every email after.
        profile: { firstName: 'Ana', onboardingCompleted: true, language: 'de' },
      });
      expect(user.resetToken).toMatch(/^[0-9a-f]{64}$/);
      // A hash of a password nobody was told.
      expect(user.password).toMatch(/^\$2[aby]\$/);
      const [, mail] = (notificationsClient.send.mock.calls[0] as any[]);
      expect(mail.to).toBe('saisie@acme.example');
      expect(mail.subject).toBe('Ihr Mitwirkenden-Konto für Service Hub');
      expect(mail.text).toContain(
        `http://mock-frontend.com/reset-password/${user.resetToken}`,
      );
    });

    it('writes the invitation in English for a language it does not have', async () => {
      await service.sendContributorInvitation('a@b.example', 't', 'xx');
      const [, mail] = (notificationsClient.send.mock.calls[0] as any[]);
      expect(mail.subject).toBe('Your Service Hub contributor account');
    });

    it('sends the reset link in the language asked, and says it left', async () => {
      expect(await service.sendResetPasswordEmail('a@b.example', 't', 'fr')).toBe(
        true,
      );
      const [, mail] = (notificationsClient.send.mock.calls[0] as any[]);
      expect(mail.subject).toBe('Réinitialisez votre mot de passe');
      expect(mail.text).toContain('http://mock-frontend.com/reset-password/t');
    });

    it('says when the invitation did not leave', async () => {
      notificationsClient.send.mockReturnValueOnce(
        of({ success: false, message: 'ECONNREFUSED' }),
      );
      expect(await service.sendContributorInvitation('a@b.example', 't')).toBe(
        false,
      );
      notificationsClient.send.mockReturnValueOnce(
        throwError(() => new Error('Connection closed')),
      );
      expect(await service.sendContributorInvitation('a@b.example', 't')).toBe(
        false,
      );
    });
  });

  describe('summariesOf', () => {
    it('names the accounts with their role, nothing secret', async () => {
      userRepository.find.mockResolvedValue([
        {
          id: 9,
          email: 'a@demo.test',
          password: 'hash',
          role: { name: 'contributor' },
          profile: { firstName: 'Ana' },
        },
        { id: 4, email: 'b@example.com', role: null, profile: null },
      ]);
      expect(await service.summariesOf([9, 4])).toEqual([
        { id: 9, email: 'a@demo.test', role: 'contributor', firstName: 'Ana', lastName: null },
        { id: 4, email: 'b@example.com', role: null, firstName: null, lastName: null },
      ]);
    });

    it('reads nothing for no ids', async () => {
      expect(await service.summariesOf([])).toEqual([]);
      expect(userRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('notifyRepairerDecision', () => {
    const decision = {
      userId: 9,
      repairerId: 'r1',
      repairerName: 'Atelier',
    };

    it("emails a publication in the account's language, with a link to it", async () => {
      userRepository.findOne.mockResolvedValue({
        id: 9,
        email: 'a@demo.test',
        profile: { language: 'nl' },
      });
      await service.notifyRepairerDecision({ ...decision, decision: 'published' });
      const [pattern, mail] = notificationsClient.emit.mock.calls[0];
      expect(pattern).toEqual({ cmd: 'send_email' });
      expect(mail.to).toBe('a@demo.test');
      expect(mail.subject).toBe('Uw reparateur staat op de kaart: Atelier');
      expect(mail.text).toContain('http://mock-frontend.com/app/repairer/r1');
    });

    it('sends a refusal to the page where it can be corrected', async () => {
      userRepository.findOne.mockResolvedValue({ id: 9, email: 'a@demo.test', profile: null });
      await service.notifyRepairerDecision({ ...decision, decision: 'rejected', note: 'Closed' });
      const [, mail] = notificationsClient.emit.mock.calls[0];
      expect(mail.text).toContain('Reason: Closed');
      expect(mail.text).toContain('http://mock-frontend.com/app/my-repairers');
    });

    it('tells nobody when the account is gone', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await service.notifyRepairerDecision({ ...decision, decision: 'applied' });
      expect(notificationsClient.emit).not.toHaveBeenCalled();
    });
  });

  describe('purgeContributors', () => {
    let query: jest.Mock;

    beforeEach(() => {
      userRepository.find.mockResolvedValue([
        { id: 9, email: 'a@demo.test' },
        { id: 12, email: 'b@demo.test' },
      ]);
      query = jest.fn(async (sql: string) => {
        if (sql.includes('SELECT profile_id')) return [{ profile_id: 41 }, { profile_id: 42 }];
        if (sql.includes('to_regclass')) return [{ present: true }];
        return [];
      });
      (userRepository as any).manager = {
        transaction: jest.fn(async (work: (m: unknown) => unknown) => work({ query })),
        query,
      };
    });

    it('only names them in a preview', async () => {
      expect(await service.purgeContributors(true)).toEqual({
        ids: [9, 12],
        emails: ['a@demo.test', 'b@demo.test'],
      });
      expect(query).not.toHaveBeenCalled();
    });

    it('deletes them, their sessions and their profiles, which do not follow by cascade', async () => {
      expect((await service.purgeContributors(false)).ids).toEqual([9, 12]);
      const deletes = query.mock.calls
        .filter(([sql]) => sql.startsWith('DELETE'))
        .map(([sql, params]) => [sql.split(' ').slice(0, 3).join(' '), params[0]]);
      expect(deletes).toEqual([
        ['DELETE FROM user_refresh_tokens', [9, 12]],
        ['DELETE FROM oauth_authorization_codes', [9, 12]],
        ['DELETE FROM oauth_refresh_tokens', [9, 12]],
        ['DELETE FROM users', [9, 12]],
        ['DELETE FROM user_profiles', [41, 42]],
      ]);
    });

    it("leaves alone OAuth tables a database does not have", async () => {
      query.mockImplementation(async (sql: string) =>
        sql.includes('to_regclass') ? [{ present: false }] : [],
      );
      await service.purgeContributors(false);
      expect(query.mock.calls.some(([sql]) => sql.includes('DELETE FROM oauth'))).toBe(false);
    });

    it('does nothing when there are none', async () => {
      userRepository.find.mockResolvedValue([]);
      expect(await service.purgeContributors(false)).toEqual({ ids: [], emails: [] });
      expect(query).not.toHaveBeenCalled();
    });

    it('deletes only the accounts the purge started with', async () => {
      await service.purgeContributors(false, [12]);
      const users = query.mock.calls.find(([sql]) => sql.startsWith('DELETE FROM users'));
      expect(users[1]).toEqual([[12]]);
    });

    it("revokes the contributors' sessions first, and only theirs", async () => {
      await service.revokeContributorSessions([9, 4]);
      expect(query).toHaveBeenCalledWith(
        'DELETE FROM user_refresh_tokens WHERE user_id = ANY($1::int[])',
        [[9]],
      );
      query.mockClear();
      await service.revokeContributorSessions([4]);
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('findByRole', () => {
    it('reads the accounts of a role, newest first', async () => {
      userRepository.find.mockResolvedValue([{ id: 9 }]);
      expect(await service.findByRole('contributor')).toEqual([{ id: 9 }]);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { role: { name: 'contributor' } },
        relations: ['profile'],
        order: { created_at: 'DESC' },
      });
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
        id: 1,
        email,
        password: hashed,
        // The link cannot set the password a second time.
        resetToken: null,
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
