// seed.module.ts (optionnel si tu veux séparer proprement)
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from 'src/database/database.module';
import { Permission } from 'src/permissions/permission.entity';
import { Role } from 'src/roles/role.entity';
import { RoleModule } from 'src/roles/roles.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    TypeOrmModule.forFeature([Role, Permission]),
    RoleModule, // si tu as besoin de RoleService
  ],
  providers: [],
})
export class SeedModule {}
