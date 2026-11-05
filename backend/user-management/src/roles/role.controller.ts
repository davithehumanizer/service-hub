import { Controller, Body } from '@nestjs/common';
import { RoleService } from './role.service';
import { MessagePattern } from '@nestjs/microservices';

/**
 * Controller for handling role-related microservice messages.
 *
 * Provides endpoints for creating roles, retrieving all roles,
 * adding permissions to roles, and fetching roles by name.
 */
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  /**
   * Handles the creation of a new role with the specified permissions.
   * @param body Object containing the role name and an array of permission names.
   * @returns The created Role entity.
   */
  @MessagePattern({ cmd: 'create_role' })
  create(@Body() body: { name: string; permissions: string[] }) {
    return this.roleService.create(body.name, body.permissions);
  }

  /**
   * Retrieves all roles.
   * @returns Array of all Role entities.
   */
  @MessagePattern({ cmd: 'find_all_roles' })
  findAll() {
    return this.roleService.findAll();
  }

  /**
   * Adds a permission to a role.
   * @param body Object containing the role ID and the permission name.
   * @returns The updated Role entity.
   */
  @MessagePattern({ cmd: 'add_permission' })
  addPermission(@Body() body: { roleId: string; permission: string }) {
    return this.roleService.addPermission(body.roleId, body.permission);
  }

  /**
   * Retrieves a role by its name.
   * @param body Object containing the role name.
   * @returns The Role entity with its permissions, or null if not found.
   */
  @MessagePattern({ cmd: 'get_role_by_name' })
  async getRoleByName(@Body() body: { name: string }) {
    console.log('getRoleByName body : ', body);
    return this.roleService.findByName(body.name);
  }
}
