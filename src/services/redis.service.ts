import { Redis } from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Create a Redis client instance
const redis = new Redis(env.REDIS_URL);

redis.on('connect', () => {
  logger.info('🟢 Connected to Redis successfully');
});

redis.on('error', (err) => {
  logger.error({ err }, '🔴 Redis connection error');
});

export default redis;
