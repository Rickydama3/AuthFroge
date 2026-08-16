import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * Ensures that an RS256 key pair exists.
 * In a real production setup, these would be injected via secrets manager or environment variables.
 * For this project, if they aren't provided in the environment, we generate them dynamically
 * and save them to a local `keys/` directory so they survive restarts during development.
 */
export const ensureKeys = (): KeyPair => {
  if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) {
    logger.info('🔑 Using RSA keys provided in environment variables.');
    return {
      privateKey: process.env.JWT_PRIVATE_KEY,
      publicKey: process.env.JWT_PUBLIC_KEY,
    };
  }

  const keysDir = path.join(process.cwd(), 'keys');
  const privateKeyPath = path.join(keysDir, 'private.pem');
  const publicKeyPath = path.join(keysDir, 'public.pem');

  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    logger.info('🔑 Loaded RSA keys from local keys/ directory.');
    return {
      privateKey: fs.readFileSync(privateKeyPath, 'utf8'),
      publicKey: fs.readFileSync(publicKeyPath, 'utf8'),
    };
  }

  logger.warn('⚠️ No RSA keys found! Generating a new 2048-bit RSA key pair...');
  
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir);
  }

  fs.writeFileSync(privateKeyPath, privateKey);
  fs.writeFileSync(publicKeyPath, publicKey);
  
  logger.info('✅ New RSA key pair generated and saved to keys/ directory.');

  return { publicKey, privateKey };
};

// Singleton key pair
export const keys = ensureKeys();
