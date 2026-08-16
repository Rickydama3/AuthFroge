import knex from 'knex';
import config from '../../knexfile';
import { env } from '../config/env';

// Select the environment configuration
const environmentConfig = config[env.NODE_ENV] || config.development;

// Create the connection
const db = knex(environmentConfig);

export default db;
