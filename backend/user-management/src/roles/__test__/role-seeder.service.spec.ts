import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoleSeederService } from '../role-seeder.service';
import { Role } from '../role.entity';
import { Permission } from '../../permissions/permission.entity';

describe('RoleSeederService', () => {
  /** Seeds an empty database and returns each role with its permissions. */
  async function seedEmptyDatabase(): Promise<Map<string, string[]>> {
    const roles = new Map<string, string[]>();
    const permissionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((p: Permission) => p),
      save: jest.fn((p: Permission) => Promise.resolve(p)),
    };
    const roleRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((r: Role) => r),
      save: jest.fn((r: Role) => {
        roles.set(r.name, r.permissions.map((p) => p.name));
        return Promise.resolve(r);
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        RoleSeederService,
        { provide: getRepositoryToken(Permission), useValue: permissionRepo },
        { provide: getRepositoryToken(Role), useValue: roleRepo },
      ],
    }).compile();
    await module.get(RoleSeederService).seed();
    return roles;
  }

  it('lets no role but admin list every account', async () => {
    const roles = await seedEmptyDatabase();

    expect([...roles.keys()]).toEqual(
      expect.arrayContaining(['guest', 'user', 'repairer', 'admin']),
    );
    expect(roles.get('admin')).toContain('user.get_all');
    for (const [name, permissions] of roles) {
      if (name !== 'admin') expect(permissions).not.toContain('user.get_all');
    }
  });
});
