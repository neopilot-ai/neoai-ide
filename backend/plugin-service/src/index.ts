import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { prisma } from './utils/database';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authMiddleware } from './middleware/auth';

// Services
import { PluginManager } from './services/PluginManager';
import { MarketplaceManager } from './services/MarketplaceManager';
import { SecurityManager } from './services/SecurityManager';
import { AnalyticsManager } from './services/AnalyticsManager';

// Routes
import { pluginsRouter } from './routes/plugins';
import { marketplaceRouter } from './routes/marketplace';
import { developersRouter } from './routes/developers';
import { reviewsRouter } from './routes/reviews';
import { analyticsRouter } from './routes/analytics';
import { healthRouter } from './routes/health';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8008;

// Initialize managers
const pluginManager = new PluginManager();
const marketplaceManager = new MarketplaceManager();
const securityManager = new SecurityManager();
const analyticsManager = new AnalyticsManager();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://neoai-ide.com', 'https://app.neoai-ide.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-user-id', 'x-user-email'],
}));

// General middleware
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stricter rate limiting for uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 uploads per windowMs
  message: {
    error: 'Too many upload requests, please try again later.',
  },
});

// Attach managers to app for route access
app.locals.pluginManager = pluginManager;
app.locals.marketplaceManager = marketplaceManager;
app.locals.securityManager = securityManager;
app.locals.analyticsManager = analyticsManager;

// Routes
app.use('/health', healthRouter);
app.use('/plugins', authMiddleware, pluginsRouter);
app.use('/marketplace', marketplaceRouter);
app.use('/developers', authMiddleware, developersRouter);
app.use('/reviews', authMiddleware, reviewsRouter);
app.use('/analytics', authMiddleware, analyticsRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'NeoAI IDE Plugin Service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: [
      'Plugin marketplace',
      'Plugin management',
      'Security scanning',
      'Developer tools',
      'Analytics and metrics',
      'Review system',
    ],
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Database connection test
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  try {
    await testDatabaseConnection();
    
    // Initialize services
    await pluginManager.initialize();
    await marketplaceManager.initialize();
    await securityManager.initialize();
    await analyticsManager.initialize();
    
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Plugin Service running on port ${PORT}`);
      logger.info(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔌 Plugin marketplace ready`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Cleanup services
          await pluginManager.cleanup();
          await marketplaceManager.cleanup();
          await securityManager.cleanup();
          await analyticsManager.cleanup();
          
          await prisma.$disconnect();
          logger.info('Database disconnected');
        } catch (error) {
          logger.error('Error during cleanup:', error);
        }
        
        logger.info('Process terminated');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
