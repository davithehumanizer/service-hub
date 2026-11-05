/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Post,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { FlexibleAuthGuard } from './flexible-auth.guard';
import { PermissionsGuard } from './permission.guard';
import { Permissions } from 'src/auth/permission.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { CreateRoleDto } from './dto/create-role.dto';
import { AddPermissionToRoleDto } from './dto/add-permission-to-role.dto';
import { RoleResponseDto } from './dto/response/role-response.dto';
import { RolesListResponseDto } from './dto/response/roles-list-response.dto';
import { AddPermissionResponseDto } from './dto/response/add-permission-response.dto';

@ApiTags('Roles')
@Controller('roles')
export class RoleController {
  private readonly logger = new Logger(RoleController.name);

  constructor(
    @Inject('USER_SERVICE') private readonly userService: ClientProxy,
  ) {}

  //create_role
  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('role.create')
  @Version('1')
  @Post('create')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({
    status: 201,
    description: 'Role created successfully.',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async createRole(@Body() body: CreateRoleDto): Promise<RoleResponseDto> {
    this.logger.log('createRole called', { body });
    try {
      const result = await firstValueFrom(
        this.userService.send({ cmd: 'create_role' }, body),
      );
      this.logger.log('createRole result', { result });
      return result;
    } catch (error) {
      this.logger.error('createRole error: ' + error?.message, error?.stack);
      throw error;
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('role.get_all')
  @Version('1')
  @Get('find-all')
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({
    status: 200,
    description: 'Returns all roles.',
    type: RolesListResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async findAllRoles(): Promise<RolesListResponseDto> {
    this.logger.log('findAllRoles called');
    try {
      const result = await firstValueFrom(
        this.userService.send({ cmd: 'find_all_roles' }, {}),
      );
      this.logger.log('findAllRoles result', { result });
      return result;
    } catch (error) {
      this.logger.error('findAllRoles error: ' + error?.message, error?.stack);
      throw error;
    }
  }

  //add permission to role
  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('role.add_permission')
  @Version('1')
  @Post('add-permission')
  @ApiOperation({ summary: 'Add a permission to a role' })
  @ApiBody({ type: AddPermissionToRoleDto })
  @ApiResponse({
    status: 201,
    description: 'Permission added to role successfully.',
    type: AddPermissionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async addPermission(
    @Body() body: AddPermissionToRoleDto,
  ): Promise<AddPermissionResponseDto> {
    this.logger.log('addPermission called', { body });
    try {
      const result = await firstValueFrom(
        this.userService.send({ cmd: 'add_permission' }, body),
      );
      this.logger.log('addPermission result', { result });
      return result;
    } catch (error) {
      this.logger.error('addPermission error: ' + error.message, error.stack);
      throw error;
    }
  }
}
