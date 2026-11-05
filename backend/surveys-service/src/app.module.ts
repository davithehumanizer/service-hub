import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveysModule } from './surveys/surveys.module';

// Off unless explicitly enabled. synchronize rewrites the schema to match
// entities and will drop columns; it must never be a default. Set
// TYPEORM_SYNCHRONIZE=true in a local .env if you want it while developing.
const synchronize = process.env.TYPEORM_SYNCHRONIZE === 'true';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'db',
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'password',
      database: process.env.DATABASE_NAME || 'servicehub',
      autoLoadEntities: true,
      synchronize,
    }),
    SurveysModule,
  ],
})
export class AppModule {}
