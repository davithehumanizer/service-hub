import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from 'src/permissions/permission.entity';
import { Role } from 'src/roles/role.entity';

const permissionGuest = [
  'device.read',
  'device_category.read',
  'device.get_filters',
  'device.search',
  'device.getByIds',
  'device.getById',
  'repairer.get_all',
  'repairer.get_filters',
  'repairer.search',
  'repairer.get_by_id',
  // allow any visitor (including guests) to flag an irrelevant map result
  'repairer.report',
];

const permissionsUser = [
  ...permissionGuest,
  'ownership.get_user_devices',
  'ownership.assign_device',
  'ownership.remove_device',
  'user.me',
  'user.update',
  'device.create',
  'device.photos.upload',
  // allow users to read categories when creating or browsing devices
  'device_category.read',
  // api catalog
  'api_catalog.submit',
  // contribute a repair record to the open dataset
  'repair.submit',
];

const permissionsRepairer = [...permissionsUser, 'repairer.profile.manage'];

const permissionsAdmin = [
  ...permissionsUser,
  // list every account with its profile: admin only
  'user.get_all',
  'repairer.create',
  'repairer.import',
  'repairer.update',
  'repairer.delete',
  // delete any photo of a device or a model: nothing says who uploaded it
  'device.photos.admin',
  // device category management
  'device_category.create',
  'device_category.update',
  'device_category.delete',
  'permission.create',
  'permission.get_all',
  'role.create',
  'role.get_all',
  'role.add_permission',
  // api catalog
  'api_catalog.admin',
  // repair monitor
  'repair.admin',
  // repairer report moderation
  'repairer.reports.admin',
];

const ROLES: Array<{ name: string; permissions: string[] }> = [
  { name: 'guest', permissions: permissionGuest },
  { name: 'user', permissions: permissionsUser },
  { name: 'repairer', permissions: permissionsRepairer },
  { name: 'admin', permissions: permissionsAdmin },
];

/**
 * Brings the roles and permissions in the database up to what the code
 * declares, **on every start of this service**.
 *
 * It used to be a standalone script nobody remembered to run, so a permission
 * added to the code simply did not exist in production: `repair.submit` was
 * declared in April and still missing in August, which silently refused every
 * call to the endpoints guarded by it. Declaring a permission and having it
 * work should be the same act.
 *
 * Purely additive and idempotent — it creates what is missing and never
 * removes anything, so running it on each boot is safe. Revoking a permission
 * therefore stays a deliberate manual operation.
 *
 * Two things it cannot do on its own, worth remembering when a permission
 * still looks absent: the api-gateway caches the guest role at its own start,
 * and a signed-in user carries their permissions inside their JWT, so they
 * need to sign in again.
 */
@Injectable()
export class RoleSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RoleSeederService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.seed();
    } catch (error) {
      // Never take the service down over this: a failed seed leaves the
      // previous permissions in place, while a crash-looping user-management
      // takes authentication with it.
      this.logger.error(
        `Could not seed roles and permissions: ${error?.message}`,
        error?.stack,
      );
    }
  }

  /** Creates whatever is missing. Safe to call repeatedly. */
  async seed(): Promise<void> {
    let created = 0;

    for (const { name, permissions } of ROLES) {
      const entities = await this.ensurePermissions(permissions);
      created += await this.ensureRole(name, entities);
    }

    if (created > 0) {
      this.logger.log(`Roles and permissions seeded: ${created} link(s) added`);
    }
  }

  /** Finds each permission by name, creating the ones that do not exist yet. */
  private async ensurePermissions(names: string[]): Promise<Permission[]> {
    const entities: Permission[] = [];

    for (const name of Array.from(new Set(names))) {
      let permission = await this.permissionRepo.findOne({ where: { name } });
      if (!permission) {
        permission = await this.permissionRepo.save(
          this.permissionRepo.create({ name }),
        );
        this.logger.log(`Created permission ${name}`);
      }
      entities.push(permission);
    }

    return entities;
  }

  /**
   * Creates the role, or grants it the permissions it is missing.
   * @returns how many permissions were added.
   */
  private async ensureRole(
    name: string,
    permissions: Permission[],
  ): Promise<number> {
    const existing = await this.roleRepo.findOne({
      where: { name },
      relations: ['permissions'],
    });

    if (!existing) {
      await this.roleRepo.save(this.roleRepo.create({ name, permissions }));
      this.logger.log(`Created role ${name}`);
      return permissions.length;
    }

    const held = new Set((existing.permissions ?? []).map((p) => p.id));
    const missing = permissions.filter((p) => !held.has(p.id));
    if (missing.length === 0) return 0;

    await this.roleRepo
      .createQueryBuilder()
      .relation(Role, 'permissions')
      .of(existing)
      .add(missing);
    this.logger.log(
      `Granted ${name}: ${missing.map((p) => p.name).join(', ')}`,
    );
    return missing.length;
  }
}
