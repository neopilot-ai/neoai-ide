import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authMiddleware } from './middleware/auth';

// Routes
import { previewRouter } from './routes/preview';
import { buildRouter } from './routes/build';
import { deployRouter } from './routes/deploy';
import { healthRouter } from './routes/health';

// Services
import { PreviewManager } from './services/PreviewManager';
import { BuildManager } from './services/BuildManager';
import { DeploymentManager } from './services/DeploymentManager';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://neoai-ide.com', 'https://app.neoai-ide.com']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8000'],
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 8006;

// Initialize managers
const previewManager = new PreviewManager(io);
const buildManager = new BuildManager(io);
const deploymentManager = new DeploymentManager(io);

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

// Stricter rate limiting for resource-intensive operations
const heavyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 heavy requests per windowMs
  message: {
    error: 'Too many resource-intensive requests, please try again later.',
  },
});

// Attach managers to app for route access
app.locals.previewManager = previewManager;
app.locals.buildManager = buildManager;
app.locals.deploymentManager = deploymentManager;

// Routes
app.use('/health', healthRouter);
app.use('/preview', authMiddleware, previewRouter);
app.use('/build', authMiddleware, heavyLimiter, buildRouter);
app.use('/deploy', authMiddleware, heavyLimiter, deployRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'NeoAI IDE Preview Service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: [
      'Development server management',
      'Live preview generation',
      'Build automation',
      'Deployment orchestration',
      'Real-time updates via WebSocket',
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

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-project', (projectId: string) => {
    socket.join(`project:${projectId}`);
    logger.info(`Client ${socket.id} joined project ${projectId}`);
  });

  socket.on('leave-project', (projectId: string) => {
    socket.leave(`project:${projectId}`);
    logger.info(`Client ${socket.id} left project ${projectId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Start server
async function startServer() {
  try {
    // Initialize services
    await previewManager.initialize();
    await buildManager.initialize();
    await deploymentManager.initialize();
    
    server.listen(PORT, () => {
      logger.info(`🚀 Preview Service running on port ${PORT}`);
      logger.info(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔌 WebSocket server ready for real-time updates`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      
      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Cleanup services
          await previewManager.cleanup();
          await buildManager.cleanup();
          await deploymentManager.cleanup();
          
          logger.info('Services cleaned up');
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
