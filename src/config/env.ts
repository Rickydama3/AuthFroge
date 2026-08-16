import { z } from 'zod';
import dotenv from 'dotenv';
import pino from 'pino';

// Load env vars early
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  
  // Database
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.string().default('3306'),
  DB_USER: z.string().default('auth_user'),
  DB_PASS: z.string().default('auth_password'),
  DB_NAME: z.string().default('authforge'),

  // Redis
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),

  // Auth Secrets
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_PRIVATE_KEY: z.string().optional(),
  
  // Token expiration times (in seconds)
  ACCESS_TOKEN_TTL: z.string().default('900'), // 15 mins
  REFRESH_TOKEN_TTL: z.string().default('2592000'), // 30 days
});

// Parse and validate
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // Can't use the regular logger here if logger depends on env
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
