import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { keys } from '../utils/crypto';
import redis from './redis.service';
import { logger } from '../utils/logger';

// Standard JWT payload
export interface JwtPayload {
  sub: string; // user ID
  iss: string; // 'authforge'
  aud: string; // client ID
  family_id?: string; // used for refresh token families
}

const ISSUER = 'authforge';
const AUDIENCE = 'authforge-client'; // Hardcoded for Phase 3, will be dynamic in Phase 5

/**
 * Generates an Access Token (short lived)
 */
export const generateAccessToken = (userId: string): string => {
  return jwt.sign(
    { sub: userId, iss: ISSUER, aud: AUDIENCE },
    keys.privateKey,
    { algorithm: 'RS256', expiresIn: Number(env.ACCESS_TOKEN_TTL) }
  );
};

/**
 * Generates a Refresh Token (long lived) and stores it in Redis
 * for rotation tracking and reuse detection.
 */
export const generateRefreshToken = async (userId: string, existingFamilyId?: string): Promise<{ token: string, familyId: string }> => {
  const familyId = existingFamilyId || uuidv4();
  const tokenId = uuidv4();

  const token = jwt.sign(
    { sub: userId, iss: ISSUER, aud: AUDIENCE, family_id: familyId, jti: tokenId },
    keys.privateKey,
    { algorithm: 'RS256', expiresIn: Number(env.REFRESH_TOKEN_TTL) }
  );

  // Store in Redis: token is valid, not yet used
  // Key format: refresh:{tokenId} -> { familyId, userId, used: false }
  await redis.set(
    `refresh:${tokenId}`,
    JSON.stringify({ familyId, userId, used: false }),
    'EX',
    Number(env.REFRESH_TOKEN_TTL)
  );

  return { token, familyId };
};

/**
 * Validates a refresh token and handles Rotation / Reuse Detection
 */
export const rotateRefreshToken = async (token: string): Promise<{ accessToken: string, refreshToken: string }> => {
  try {
    // 1. Verify cryptographic signature
    const decoded = jwt.verify(token, keys.publicKey, { algorithms: ['RS256'] }) as jwt.JwtPayload;
    const { sub: userId, jti: tokenId, family_id: familyId } = decoded;

    if (!tokenId || !familyId || !userId) {
      throw new Error('Invalid token payload');
    }

    // 2. Check if token family is revoked
    const isFamilyRevoked = await redis.get(`family:${familyId}:revoked`);
    if (isFamilyRevoked === 'true') {
      logger.warn({ userId, familyId }, '🚨 Attempt to use token from a revoked family');
      throw new Error('Token family revoked. Please log in again.');
    }

    // 3. Fetch token state from Redis
    const tokenStateStr = await redis.get(`refresh:${tokenId}`);
    if (!tokenStateStr) {
      throw new Error('Refresh token not found or expired');
    }

    const tokenState = JSON.parse(tokenStateStr);

    // 4. Reuse Detection (The core security feature)
    if (tokenState.used) {
      logger.warn({ userId, tokenId, familyId }, '🚨 Refresh token reuse detected! Revoking entire family.');
      // Revoke the family
      await redis.set(`family:${familyId}:revoked`, 'true', 'EX', Number(env.REFRESH_TOKEN_TTL));
      throw new Error('Security alert: Token reuse detected. Session terminated.');
    }

    // 5. Mark token as used (Rotation)
    await redis.set(
      `refresh:${tokenId}`,
      JSON.stringify({ ...tokenState, used: true }),
      'EX',
      Number(env.REFRESH_TOKEN_TTL)
    );

    // 6. Issue new token pair
    const newAccessToken = generateAccessToken(userId);
    const { token: newRefreshToken } = await generateRefreshToken(userId, familyId);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };

  } catch (error) {
    logger.error({ err: error }, 'Token rotation failed');
    throw error;
  }
};

/**
 * Revokes an entire token family (Logout)
 */
export const revokeFamily = async (familyId: string): Promise<void> => {
  await redis.set(`family:${familyId}:revoked`, 'true', 'EX', Number(env.REFRESH_TOKEN_TTL));
  logger.info({ familyId }, 'Token family revoked');
};
