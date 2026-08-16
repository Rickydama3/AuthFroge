import type { Knex } from 'knex';
import { env } from './src/config/env';

// Update with your config settings.
const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql2',
    connection: {
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      user: env.DB_USER,
      password: env.DB_PASS,
      database: env.DB_NAME,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './src/db/migrations',
      extension: 'ts',
    },
  },
  production: {
    client: 'mysql2',
    connection: {
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      user: env.DB_USER,
      password: env.DB_PASS,
      database: env.DB_NAME,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './src/db/migrations',
      extension: 'ts',
    },
  }
};

export default config;
