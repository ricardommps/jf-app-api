import { config } from 'dotenv';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

const envFilePath =
  process.env.ENV_FILE_PATH ||
  (process.env.NODE_ENV === 'development'
    ? '.env.development.local'
    : '.env.prod.local');

config({ path: envFilePath });

const dbSslValue = process.env.DB_SSL?.toLowerCase();
const shouldUseSsl =
  dbSslValue !== undefined
    ? ['true', '1', 'require'].includes(dbSslValue)
    : process.env.DB_HOST?.includes('neon.tech') ?? false;

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [`${__dirname}/**/*.entity{.ts,.js}`],
  migrations: [`${__dirname}/migration/**/*{.ts,.js}`],
  synchronize: false,
  migrationsRun: false,
  ssl: shouldUseSsl,
});
