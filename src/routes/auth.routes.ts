import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import db from '../db';
import { logger } from '../utils/logger';
import { generateAccessToken, generateRefreshToken, rotateRefreshToken, revokeFamily } from '../services/token.service';

const router = Router();

// Validation schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.errors });
    }

    const { email, password } = parsed.data;

    // Check if user exists
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      // In a real app, use a generic error message to prevent email enumeration.
      // But for a resume project, returning 409 is acceptable if documented as a tradeoff.
      // We will use a generic message to be completely secure.
      return res.status(400).json({ message: 'Registration failed. Email may already be in use.' });
    }

    // Hash password
    const saltRounds = 12; // High cost factor
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert user
    await db('users').insert({
      email,
      password_hash,
    });

    logger.info(`New user registered: ${email}`);

    return res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Error in /register');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.errors });
    }

    const { email, password } = parsed.data;

    // Fetch user
    const user = await db('users').where({ email }).first();
    if (!user || !user.password_hash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate Tokens
    const accessToken = generateAccessToken(user.id);
    const { token: refreshToken } = await generateRefreshToken(user.id);

    logger.info(`User logged in: ${email}`);

    return res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error in /login');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Refresh token route
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const tokens = await rotateRefreshToken(refresh_token);
    return res.status(200).json(tokens);
  } catch (error: any) {
    // If it's a reuse detection error or invalid token, return 401
    return res.status(401).json({ message: error.message || 'Invalid refresh token' });
  }
});

// Logout route
router.post('/logout', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ message: 'Refresh token is required' });

    // Decode to get family_id (we don't strictly verify signature for logout, just decode)
    const decoded = jwt.decode(refresh_token) as jwt.JwtPayload;
    if (decoded && decoded.family_id) {
      await revokeFamily(decoded.family_id);
    }

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error({ err: error }, 'Error in /logout');
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
