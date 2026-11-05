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
import { CreatePermissionDto } from './dto/create-permission.dto';
import { PermissionResponseDto } from './dto/response/permission-response.dto';
import { PermissionsListResponseDto } from './dto/response/permissions-list-response.dto';

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionController {
  private readonly logger = new Logger(PermissionController.name);

  constructor(
    @Inject('USER_SERVICE') private readonly userService: ClientProxy,
  ) {}

  // Create a new permission
  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('permission.create')
  @Version('1')
  @Post('create')
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiBody({ type: CreatePermissionDto })
  @ApiResponse({
    status: 201,
    description: 'Permission created successfully.',
    type: PermissionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async createPermission(
    @Body() body: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    this.logger.log('createPermission called', { body });
    try {
      const result = await firstValueFrom(
        this.userService.send({ cmd: 'create_permission' }, body),
      );
      this.logger.log('createPermission result', { result });
      return result;
    } catch (error) {
      this.logger.error(
        'createPermission error: ' + error?.message,
        error?.stack,
      );
      throw error;
    }
  }

  // Get all permissions
  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('permission.get_all')
  @Version('1')
  @Get('find-all')
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({
    status: 200,
    description: 'Returns all permissions.',
    type: PermissionsListResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async findAllPermissions(): Promise<PermissionsListResponseDto> {
    this.logger.log('findAllPermissions called');
    try {
      const result = await firstValueFrom(
        this.userService.send({ cmd: 'find_all_permissions' }, {}),
      );
      this.logger.log('findAllPermissions result', { result });
      return result;
    } catch (error) {
      this.logger.error(
        'findAllPermissions error: ' + error?.message,
        error?.stack,
      );
      throw error;
    }
  }
}
