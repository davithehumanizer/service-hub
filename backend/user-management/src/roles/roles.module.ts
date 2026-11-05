import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { RoleService } from './role.service';
import { RoleSeederService } from './role-seeder.service';
import { Permission } from 'src/permissions/permission.entity';
import { PermissionModule } from 'src/permissions/permmissions.module';
import { RoleController } from './role.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Permission]),
    PermissionModule,
    ConfigModule,
  ],
  providers: [RoleService, RoleSeederService],
  controllers: [RoleController],
  exports: [RoleService, RoleSeederService, TypeOrmModule],
})
export class RoleModule {}
