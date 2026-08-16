import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server if not imported (for testing)
if (require.main === module) {
  app.listen(env.PORT, () => {
    logger.info(`🚀 AuthForge API running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });
}

export default app;
