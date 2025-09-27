import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authMiddleware } from './middleware/auth';

// Services
import { CollaborationManager } from './services/CollaborationManager';
import { DocumentManager } from './services/DocumentManager';
import { AwarenessManager } from './services/AwarenessManager';
import { PermissionManager } from './services/PermissionManager';

// Routes
import { collaborationRouter } from './routes/collaboration';
import { documentsRouter } from './routes/documents';
import { sessionsRouter } from './routes/sessions';
import { healthRouter } from './routes/health';

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
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

const PORT = process.env.PORT || 8007;

// Initialize managers
const documentManager = new DocumentManager();
const awarenessManager = new AwarenessManager(io);
const permissionManager = new PermissionManager();
const collaborationManager = new CollaborationManager(
  io,
  documentManager,
  awarenessManager,
  permissionManager
);

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Higher limit for real-time collaboration
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Attach managers to app for route access
app.locals.collaborationManager = collaborationManager;
app.locals.documentManager = documentManager;
app.locals.awarenessManager = awarenessManager;
app.locals.permissionManager = permissionManager;

// Routes
app.use('/health', healthRouter);
app.use('/collaboration', authMiddleware, collaborationRouter);
app.use('/documents', authMiddleware, documentsRouter);
app.use('/sessions', authMiddleware, sessionsRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'NeoAI IDE Collaboration Service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: [
      'Real-time collaborative editing',
      'Operational transforms',
      'User awareness',
      'Permission management',
      'Document synchronization',
      'Conflict resolution',
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

  // Handle collaboration events
  collaborationManager.handleConnection(socket);

  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
    collaborationManager.handleDisconnection(socket);
  });

  socket.on('error', (error) => {
    logger.error(`Socket error for ${socket.id}:`, error);
  });
});

// Start server
async function startServer() {
  try {
    // Initialize services
    await documentManager.initialize();
    await awarenessManager.initialize();
    await permissionManager.initialize();
    await collaborationManager.initialize();
    
    server.listen(PORT, () => {
      logger.info(`🚀 Collaboration Service running on port ${PORT}`);
      logger.info(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔌 WebSocket server ready for real-time collaboration`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      
      // Close WebSocket connections
      io.close(() => {
        logger.info('WebSocket server closed');
      });
      
      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Cleanup services
          await collaborationManager.cleanup();
          await awarenessManager.cleanup();
          await documentManager.cleanup();
          await permissionManager.cleanup();
          
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
