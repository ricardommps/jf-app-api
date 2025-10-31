import { config } from 'dotenv';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

config({ path: '.env.development.local' });

const isTs = __filename.endsWith('.ts');

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [isTs ? 'src/**/*.entity.ts' : 'dist/**/*.entity.js'],
  migrations: [isTs ? 'src/migration/**/*.ts' : 'dist/migration/**/*.js'],
  synchronize: false,
  migrationsRun: false,
  ssl: false,
});
