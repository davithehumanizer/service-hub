import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiTool } from "../api-catalog/entities/api-tool.entity";

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DATABASE_HOST || "db",
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      username: process.env.DATABASE_USER || "postgres",
      password: process.env.DATABASE_PASSWORD || "password",
      database: process.env.DATABASE_NAME || "servicehub",
      entities: [ApiTool],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([ApiTool]),
  ],
})
export class SeedModule {}
