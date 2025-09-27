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
import { MarketplaceManager } from './services/MarketplaceManager';
import { ModelManager } from './services/ModelManager';
import { PromptManager } from './services/PromptManager';
import { PaymentProcessor } from './services/PaymentProcessor';
import { LicenseManager } from './services/LicenseManager';
import { SecurityScanner } from './services/SecurityScanner';
import { RecommendationEngine } from './services/RecommendationEngine';
import { BlockchainManager } from './services/BlockchainManager';

// Routes
import { marketplaceRouter } from './routes/marketplace';
import { modelsRouter } from './routes/models';
import { promptsRouter } from './routes/prompts';
import { paymentsRouter } from './routes/payments';
import { licensesRouter } from './routes/licenses';
import { developersRouter } from './routes/developers';
import { analyticsRouter } from './routes/analytics';
import { healthRouter } from './routes/health';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8013;

// Initialize services
const marketplaceManager = new MarketplaceManager();
const modelManager = new ModelManager();
const promptManager = new PromptManager();
const paymentProcessor = new PaymentProcessor();
const licenseManager = new LicenseManager();
const securityScanner = new SecurityScanner();
const recommendationEngine = new RecommendationEngine();
const blockchainManager = new BlockchainManager();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://api.paypal.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["https://js.stripe.com", "https://www.paypal.com"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://neoai-ide.com', 'https://app.neoai-ide.com', 'https://marketplace.neoai-ide.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-user-id', 'x-user-email'],
}));

// General middleware
app.use(compression());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
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
  max: 10, // limit each IP to 10 uploads per windowMs
  message: {
    error: 'Too many upload requests, please try again later.',
  },
});

// Attach services to app for route access
app.locals.marketplaceManager = marketplaceManager;
app.locals.modelManager = modelManager;
app.locals.promptManager = promptManager;
app.locals.paymentProcessor = paymentProcessor;
app.locals.licenseManager = licenseManager;
app.locals.securityScanner = securityScanner;
app.locals.recommendationEngine = recommendationEngine;
app.locals.blockchainManager = blockchainManager;

// Routes
app.use('/health', healthRouter);
app.use('/marketplace', marketplaceRouter);
app.use('/models', authMiddleware, modelsRouter);
app.use('/prompts', authMiddleware, promptsRouter);
app.use('/payments', authMiddleware, paymentsRouter);
app.use('/licenses', authMiddleware, licensesRouter);
app.use('/developers', authMiddleware, developersRouter);
app.use('/analytics', authMiddleware, analyticsRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'NeoAI IDE AI Marketplace Service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: [
      'AI model marketplace',
      'Prompt library',
      'Monetization platform',
      'Blockchain integration',
      'Smart contracts',
      'NFT support',
      'Revenue sharing',
      'License management',
      'Security scanning',
      'Recommendation engine',
      'Developer tools',
      'Analytics dashboard',
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
    await marketplaceManager.initialize();
    await modelManager.initialize();
    await promptManager.initialize();
    await paymentProcessor.initialize();
    await licenseManager.initialize();
    await securityScanner.initialize();
    await recommendationEngine.initialize();
    await blockchainManager.initialize();
    
    const server = app.listen(PORT, () => {
      logger.info(`🚀 AI Marketplace Service running on port ${PORT}`);
      logger.info(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🤖 AI marketplace and monetization ready`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Cleanup services
          await marketplaceManager.cleanup();
          await modelManager.cleanup();
          await promptManager.cleanup();
          await paymentProcessor.cleanup();
          await licenseManager.cleanup();
          await securityScanner.cleanup();
          await recommendationEngine.cleanup();
          await blockchainManager.cleanup();
          
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
