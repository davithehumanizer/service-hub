import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { Repository, In } from 'typeorm';
import { Permission } from 'src/permissions/permission.entity';

/**
 * Service for managing roles and their permissions.
 *
 * Provides methods for creating roles, retrieving roles, finding roles by name,
 * and adding permissions to roles.
 */
@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepo: Repository<Permission>,
  ) {}

  /**
   * Creates a new role with the given name and associated permissions.
   * @param name The name of the role.
   * @param permissionNames Array of permission names to associate with the role.
   * @returns The created Role entity.
   */
  async create(name: string, permissionNames: string[]): Promise<Role> {
    const permissions = await this.permissionRepo.findBy({
      name: In(permissionNames),
    });
    const role = this.roleRepo.create({ name, permissions });
    return this.roleRepo.save(role);
  }

  /**
   * Retrieves all roles from the database.
   * @returns Array of all Role entities.
   */
  async findAll(): Promise<Role[]> {
    return this.roleRepo.find();
  }

  /**
   * Finds a role by its name, including its permissions.
   * @param name The name of the role to find.
   * @returns The Role entity with its permissions, or null if not found.
   */
  async findByName(name: string): Promise<Role | null> {
    return this.roleRepo.findOne({
      where: { name },
      relations: ['permissions'],
    });
  }

  /**
   * Adds a permission to a role by role ID and permission name.
   * Throws an error if the role or permission is not found.
   * @param roleId The ID of the role.
   * @param permissionName The name of the permission to add.
   * @returns The updated Role entity.
   */
  async addPermission(roleId: string, permissionName: string): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id: Number(roleId) } });
    if (!role) {
      throw new Error('Role not found');
    }
    const permission = await this.permissionRepo.findOne({
      where: { name: permissionName },
    });
    if (!permission) {
      throw new Error('Permission not found');
    }
    role.permissions.push(permission);
    return this.roleRepo.save(role);
  }
}
