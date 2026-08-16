import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import db from '../db';
import { logger } from '../utils/logger';

const router = Router();

// All routes here require authentication
router.use(authenticate);

// List all users - requires 'users:read' permission
router.get('/users', requirePermission('users:read'), async (req, res) => {
  try {
    const users = await db('users').select('id', 'email', 'created_at');
    return res.status(200).json(users);
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch users');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Assign a role to a user - requires 'roles:write' permission
router.post('/users/:id/roles', requirePermission('roles:write'), async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ message: 'roleId is required' });
    }

    // Check if user exists
    const user = await db('users').where({ id: userId }).first();
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if role exists
    const role = await db('roles').where({ id: roleId }).first();
    if (!role) return res.status(404).json({ message: 'Role not found' });

    // Assign role (upsert or insert, ignoring duplicates using generic catch or raw query)
    // For simplicity, we just insert and catch duplication error
    try {
      await db('user_roles').insert({ user_id: userId, role_id: roleId });
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'User already has this role' });
      }
      throw e;
    }

    logger.info({ adminId: req.user?.id, targetUserId: userId, roleId }, 'Role assigned to user');
    return res.status(200).json({ message: 'Role assigned successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to assign role');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
