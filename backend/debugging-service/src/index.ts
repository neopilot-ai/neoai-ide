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
import { DebuggerManager } from './services/DebuggerManager';
import { ProfilerManager } from './services/ProfilerManager';
import { PerformanceMonitor } from './services/PerformanceMonitor';
import { CodeAnalyzer } from './services/CodeAnalyzer';
import { TestRunner } from './services/TestRunner';
import { LogAnalyzer } from './services/LogAnalyzer';

// Routes
import { debuggerRouter } from './routes/debugger';
import { profilerRouter } from './routes/profiler';
import { performanceRouter } from './routes/performance';
import { analyzerRouter } from './routes/analyzer';
import { testingRouter } from './routes/testing';
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

const PORT = process.env.PORT || 8011;

// Initialize managers
const debuggerManager = new DebuggerManager(io);
const profilerManager = new ProfilerManager(io);
const performanceMonitor = new PerformanceMonitor(io);
const codeAnalyzer = new CodeAnalyzer();
const testRunner = new TestRunner(io);
const logAnalyzer = new LogAnalyzer();

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
  max: 1000, // Higher limit for debugging operations
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Attach managers to app for route access
app.locals.debuggerManager = debuggerManager;
app.locals.profilerManager = profilerManager;
app.locals.performanceMonitor = performanceMonitor;
app.locals.codeAnalyzer = codeAnalyzer;
app.locals.testRunner = testRunner;
app.locals.logAnalyzer = logAnalyzer;

// Routes
app.use('/health', healthRouter);
app.use('/debugger', authMiddleware, debuggerRouter);
app.use('/profiler', authMiddleware, profilerRouter);
app.use('/performance', authMiddleware, performanceRouter);
app.use('/analyzer', authMiddleware, analyzerRouter);
app.use('/testing', authMiddleware, testingRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'NeoAI IDE Debugging Service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: [
      'Multi-language debugging',
      'Performance profiling',
      'Code analysis',
      'Test automation',
      'Log analysis',
      'Real-time monitoring',
      'Memory profiling',
      'CPU profiling',
      'Network monitoring',
      'Error tracking',
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
  logger.info(`Debug client connected: ${socket.id}`);

  // Handle debugger events
  debuggerManager.handleConnection(socket);
  
  // Handle profiler events
  profilerManager.handleConnection(socket);
  
  // Handle performance monitoring events
  performanceMonitor.handleConnection(socket);
  
  // Handle test runner events
  testRunner.handleConnection(socket);

  socket.on('disconnect', (reason) => {
    logger.info(`Debug client disconnected: ${socket.id}, reason: ${reason}`);
    
    // Cleanup resources
    debuggerManager.handleDisconnection(socket);
    profilerManager.handleDisconnection(socket);
    performanceMonitor.handleDisconnection(socket);
    testRunner.handleDisconnection(socket);
  });

  socket.on('error', (error) => {
    logger.error(`Socket error for ${socket.id}:`, error);
  });
});

// Start server
async function startServer() {
  try {
    // Initialize services
    await debuggerManager.initialize();
    await profilerManager.initialize();
    await performanceMonitor.initialize();
    await codeAnalyzer.initialize();
    await testRunner.initialize();
    await logAnalyzer.initialize();
    
    server.listen(PORT, () => {
      logger.info(`🚀 Debugging Service running on port ${PORT}`);
      logger.info(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🐛 Advanced debugging tools ready`);
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
          await debuggerManager.cleanup();
          await profilerManager.cleanup();
          await performanceMonitor.cleanup();
          await codeAnalyzer.cleanup();
          await testRunner.cleanup();
          await logAnalyzer.cleanup();
          
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
