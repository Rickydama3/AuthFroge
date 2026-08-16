import db from './index';
import { logger } from '../utils/logger';

async function runMigrations() {
  try {
    logger.info('Running database migrations...');
    await db.migrate.latest();
    logger.info('Database migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Database migrations failed.');
    process.exit(1);
  }
}

runMigrations();
