/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { UserController } from '../user.controller';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user.entity';
import { UserProfile } from '../../user-profile/user-profile.entity';
import { RecaptchaService } from '../../recaptcha/recaptcha.service';
import { Role } from 'src/roles/role.entity';
import { RoleService } from 'src/roles/role.service';
import { Permission } from 'src/permissions/permission.entity';
import { ConfigService } from '@nestjs/config';
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

const mockRoleRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
});

const mockPermissionRepository = () => ({
  findBy: jest.fn(),
  save: jest.fn(),
});

const mockClientProxy = () => ({
  emit: jest.fn(),
  send: jest.fn(),
});

describe('UserModule', () => {
  let userService: UserService;
  let userController: UserController;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserService,
        RoleService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
        {
          provide: getRepositoryToken(UserProfile),
          useFactory: mockProfileRepository,
        },
        { provide: getRepositoryToken(Role), useFactory: mockRoleRepository },
        {
          provide: getRepositoryToken(Permission),
          useFactory: mockPermissionRepository,
        },
        { provide: 'NOTIFICATIONS_SERVICE', useFactory: mockClientProxy },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'http://mock-frontend.com') },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            issue: jest.fn(),
            rotate: jest.fn(),
            revoke: jest.fn(),
            revokeAllForUser: jest.fn(),
          },
        },
        {
          provide: RecaptchaService,
          useValue: {
            verify: jest.fn().mockResolvedValue({ success: true, score: 1 }),
          },
        },
      ],
    }).compile();

    userService = moduleRef.get<UserService>(UserService);
    userController = moduleRef.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
    expect(userController).toBeDefined();
  });

  it('should create a user (example)', async () => {
    const mockRole = { id: 1, name: 'user', permissions: [] } as Role;
    const mockProfile = { id: 1 } as UserProfile;
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      profile: mockProfile,
    } as User;

    const userRepo = moduleRef.get(getRepositoryToken(User));
    const profileRepo = moduleRef.get(getRepositoryToken(UserProfile));

    profileRepo.create.mockReturnValue(mockProfile);
    profileRepo.save.mockResolvedValue(mockProfile);
    userRepo.create.mockReturnValue(mockUser);
    userRepo.save.mockResolvedValue(mockUser);

    const user = await userService.create(
      'test@example.com',
      'password123',
      mockRole,
      {},
      'confirmation-token',
    );

    expect(user).toHaveProperty('id');
    expect(user.email).toBe('test@example.com');
  });
});
