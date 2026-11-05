import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IDeviceCategoryService } from '../interfaces/device-category-service.interface';

@Controller('device-categories')
export class DeviceCategoryController {
  constructor(
    @Inject('IDeviceCategoryService')
    private readonly categoryService: IDeviceCategoryService,
  ) {}

  @Get()
  async findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.categoryService.findOne(id);
  }

  @Get('urn/:urn')
  async findByUrn(@Param('urn') urn: string) {
    const category = await this.categoryService.findByUrn(urn);
    if (!category) {
      throw new Error(`Category with URN ${urn} not found`);
    }
    return category;
  }

  @Post()
  async create(@Body('name') name: string) {
    return this.categoryService.create(name);
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body('name') name: string,
    @Body('ifixit_wikiid') ifixitWikiid?: string | null,
  ) {
    return this.categoryService.update(id, name, ifixitWikiid);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    await this.categoryService.remove(id);
    return { deleted: true };
  }
}
