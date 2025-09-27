import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
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
import { AnalyticsEngine } from './services/AnalyticsEngine';
import { DataWarehouse } from './services/DataWarehouse';
import { ReportingEngine } from './services/ReportingEngine';
import { DashboardManager } from './services/DashboardManager';
import { MetricsCollector } from './services/MetricsCollector';
import { AlertManager } from './services/AlertManager';
import { DataPipeline } from './services/DataPipeline';
import { MLAnalytics } from './services/MLAnalytics';

// Routes
import { analyticsRouter } from './routes/analytics';
import { dashboardRouter } from './routes/dashboard';
import { reportsRouter } from './routes/reports';
import { metricsRouter } from './routes/metrics';
import { alertsRouter } from './routes/alerts';
import { dataRouter } from './routes/data';
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

const PORT = process.env.PORT || 8012;

// Initialize services
const analyticsEngine = new AnalyticsEngine();
const dataWarehouse = new DataWarehouse();
const reportingEngine = new ReportingEngine();
const dashboardManager = new DashboardManager(io);
const metricsCollector = new MetricsCollector();
const alertManager = new AlertManager(io);
const dataPipeline = new DataPipeline();
const mlAnalytics = new MLAnalytics();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://neoai-ide.com', 'https://app.neoai-ide.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-user-id', 'x-user-email', 'x-tenant-id'],
}));

// General middleware
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Higher limit for analytics queries
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Attach services to app for route access
app.locals.analyticsEngine = analyticsEngine;
app.locals.dataWarehouse = dataWarehouse;
app.locals.reportingEngine = reportingEngine;
app.locals.dashboardManager = dashboardManager;
app.locals.metricsCollector = metricsCollector;
app.locals.alertManager = alertManager;
app.locals.dataPipeline = dataPipeline;
app.locals.mlAnalytics = mlAnalytics;

// Routes
app.use('/health', healthRouter);
app.use('/analytics', authMiddleware, analyticsRouter);
app.use('/dashboard', authMiddleware, dashboardRouter);
app.use('/reports', authMiddleware, reportsRouter);
app.use('/metrics', authMiddleware, metricsRouter);
app.use('/alerts', authMiddleware, alertsRouter);
app.use('/data', authMiddleware, dataRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'NeoAI IDE Analytics Service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: [
      'Real-time analytics',
      'Business intelligence',
      'Custom dashboards',
      'Automated reporting',
      'Performance metrics',
      'User behavior analysis',
      'Code quality analytics',
      'AI model performance',
      'Resource utilization',
      'Predictive analytics',
      'Anomaly detection',
      'Multi-dimensional analysis',
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
  logger.info(`Analytics client connected: ${socket.id}`);

  // Handle dashboard subscriptions
  dashboardManager.handleConnection(socket);
  
  // Handle real-time metrics
  metricsCollector.handleConnection(socket);
  
  // Handle alerts
  alertManager.handleConnection(socket);

  socket.on('disconnect', (reason) => {
    logger.info(`Analytics client disconnected: ${socket.id}, reason: ${reason}`);
    
    // Cleanup subscriptions
    dashboardManager.handleDisconnection(socket);
    metricsCollector.handleDisconnection(socket);
    alertManager.handleDisconnection(socket);
  });

  socket.on('error', (error) => {
    logger.error(`Socket error for ${socket.id}:`, error);
  });
});

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
    await analyticsEngine.initialize();
    await dataWarehouse.initialize();
    await reportingEngine.initialize();
    await dashboardManager.initialize();
    await metricsCollector.initialize();
    await alertManager.initialize();
    await dataPipeline.initialize();
    await mlAnalytics.initialize();
    
    const serverInstance = server.listen(PORT, () => {
      logger.info(`🚀 Analytics Service running on port ${PORT}`);
      logger.info(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📊 Enterprise analytics and BI ready`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      
      // Close WebSocket connections
      io.close(() => {
        logger.info('WebSocket server closed');
      });
      
      // Stop accepting new connections
      serverInstance.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Cleanup services
          await analyticsEngine.cleanup();
          await dataWarehouse.cleanup();
          await reportingEngine.cleanup();
          await dashboardManager.cleanup();
          await metricsCollector.cleanup();
          await alertManager.cleanup();
          await dataPipeline.cleanup();
          await mlAnalytics.cleanup();
          
          await prisma.$disconnect();
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
