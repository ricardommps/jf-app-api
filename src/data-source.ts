import { config } from 'dotenv';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

config({ path: '.env.development.local' });

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
  ssl: true,
});
