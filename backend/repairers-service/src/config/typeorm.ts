import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config(); // Charger les variables d'environnement

const isTest = process.env.NODE_ENV === 'test';
// Resolved from this file location, so it is correct whether the service
// runs from src/ (ts-node, jest) or from the compiled output — whose layout
// differs between services (dist/ vs dist/src/).
const here = (glob: string) => path.join(__dirname, glob);

// Off unless explicitly enabled. synchronize rewrites the schema to match
// entities and will drop columns; it must never be a default. Set
// TYPEORM_SYNCHRONIZE=true in a local .env if you want it while developing.
const synchronize = process.env.TYPEORM_SYNCHRONIZE === 'true';

const config: DataSourceOptions = isTest
  ? {
      type: 'sqlite',
      database: ':memory:',
      entities: ['src/**/*.entity.ts'],
      synchronize: true,
      dropSchema: true,
      logging: false,
    }
  : {
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [here('../**/*.entity{.ts,.js}')],
      migrations: [here('../migrations/[0-9]*-*{.ts,.js}')],
      synchronize,
      logging: true,
    };

const connectionSource = new DataSource(config);

export const connectionSourceOption: DataSourceOptions = config;

export default connectionSource;
