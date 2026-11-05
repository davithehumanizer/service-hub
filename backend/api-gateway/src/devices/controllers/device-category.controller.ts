/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Inject,
  HttpException,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
  Headers,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { DeviceCategoryDto } from '../dto/device-category.dto';
import { CreateDeviceCategoryDto } from '../dto/create-device-category.dto';
import { FlexibleAuthGuard } from 'src/auth/flexible-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { Permissions } from 'src/auth/permission.decorator';

@ApiTags('Device Categories')
@ApiExtraModels(DeviceCategoryDto, CreateDeviceCategoryDto)
@Controller('device-categories')
export class DeviceCategoryController {
  constructor(
    @Inject('DEVICES_SERVICE') private readonly devicesService: ClientProxy,
  ) {}

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device_category.read')
  @Get()
  @ApiOperation({ summary: 'Get all device categories' })
  @ApiResponse({
    status: 200,
    description: 'Returns all categories.',
    schema: {
      type: 'array',
      items: {
        $ref: getSchemaPath(DeviceCategoryDto),
      },
    },
  })
  async findAll(@Headers('accept-language') acceptLanguage?: string) {
    try {
      const locale = (acceptLanguage || 'en')
        .split(/[,;]/)[0]
        .trim()
        .slice(0, 2);
      const res = await firstValueFrom(
        this.devicesService.send({ cmd: 'get_device_categories' }, { locale }),
      );
      return res;
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Failed to get categories',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device_category.read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a device category by ID' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Returns the category.',
    schema: { $ref: getSchemaPath(DeviceCategoryDto) },
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const res = await firstValueFrom(
        this.devicesService.send({ cmd: 'get_device_category' }, { id }),
      );
      return res;
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Failed to get category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device_category.read')
  @Get('urn/:urn')
  @ApiOperation({ summary: 'Get a device category by URN' })
  @ApiParam({ name: 'urn', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Returns the category.',
    schema: { $ref: getSchemaPath(DeviceCategoryDto) },
  })
  async findByUrn(@Param('urn') urn: string) {
    try {
      const res = await firstValueFrom(
        this.devicesService.send(
          { cmd: 'get_device_category_by_urn' },
          { urn },
        ),
      );
      return res;
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Failed to get category by URN',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device_category.read')
  @Get('unukey/:unukey')
  @ApiOperation({ summary: 'Get a device category by UNUkey' })
  @ApiParam({ name: 'unukey', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Returns the categories.',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(DeviceCategoryDto) },
    },
  })
  async findByUnukey(@Param('unukey') unukey: string) {
    try {
      const res = await firstValueFrom(
        this.devicesService.send(
          { cmd: 'get_device_category_by_unukey' },
          { unukey },
        ),
      );
      return res;
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Failed to get category by UNUkey',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device_category.create')
  @Post()
  @ApiOperation({ summary: 'Create a device category' })
  @ApiBody({ schema: { $ref: getSchemaPath(CreateDeviceCategoryDto) } })
  @ApiResponse({ status: 201, description: 'Category created.' })
  async create(@Body() dto: CreateDeviceCategoryDto) {
    try {
      const res = await firstValueFrom(
        this.devicesService.send(
          { cmd: 'create_device_category' },
          { name: dto.name },
        ),
      );
      return res;
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Failed to create category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device_category.update')
  @Put(':id')
  @ApiOperation({ summary: 'Update a device category' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiBody({ schema: { $ref: getSchemaPath(CreateDeviceCategoryDto) } })
  @ApiResponse({ status: 200, description: 'Category updated.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDeviceCategoryDto,
  ) {
    try {
      const res = await firstValueFrom(
        this.devicesService.send(
          { cmd: 'update_device_category' },
          { id, name: dto.name },
        ),
      );
      return res;
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Failed to update category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(FlexibleAuthGuard, PermissionsGuard)
  @Permissions('device_category.delete')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a device category' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Category deleted.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await firstValueFrom(
        this.devicesService.send({ cmd: 'delete_device_category' }, { id }),
      );
      return { deleted: true };
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Failed to delete category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
