import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Factory function that creates a middleware to enforce a specific permission.
 * MUST be used after the `authenticate` middleware.
 */
export const requirePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.error('requirePermission called without req.user. Did you forget the authenticate middleware?');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    if (!req.user.permissions.includes(requiredPermission)) {
      logger.warn({ userId: req.user.id, requiredPermission }, 'Forbidden access attempt');
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
