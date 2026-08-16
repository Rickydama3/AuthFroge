import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { keys } from '../utils/crypto';
import db from '../db';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        permissions: string[];
      };
    }
  }
}

/**
 * Middleware to authenticate requests via JWT.
 * It verifies the token and fetches the user's permissions from the DB.
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, keys.publicKey, { algorithms: ['RS256'] }) as jwt.JwtPayload;
    
    if (!decoded.sub) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    // Fetch user permissions dynamically to ensure they are always fresh.
    // In a higher-scale environment, we might cache this array in Redis for ~5 minutes.
    const permissionsRecords = await db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .join('user_roles', 'role_permissions.role_id', 'user_roles.role_id')
      .where('user_roles.user_id', decoded.sub)
      .select('permissions.name');

    const permissions = permissionsRecords.map((p) => p.name);

    req.user = {
      id: decoded.sub,
      permissions,
    };

    next();
  } catch (error) {
    logger.warn({ err: error }, 'Authentication failed');
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
