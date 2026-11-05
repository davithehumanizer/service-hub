import { Controller, Body } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @MessagePattern({ cmd: 'create_permission' })
  create(@Body('name') name: string) {
    return this.permissionService.create(name);
  }

  @MessagePattern({ cmd: 'find_all_permissions' })
  findAll() {
    return this.permissionService.findAll();
  }
}
