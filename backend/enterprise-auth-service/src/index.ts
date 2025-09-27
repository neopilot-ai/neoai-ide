import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import ConnectRedis from 'connect-redis';
import passport from 'passport';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { prisma } from './utils/database';
import { redisClient } from './utils/redis';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { auditLogger } from './middleware/auditLogger';

// Services
import { SSOManager } from './services/SSOManager';
import { AuditService } from './services/AuditService';
import { ComplianceManager } from './services/ComplianceManager';
import { SecurityManager } from './services/SecurityManager';
import { MFAManager } from './services/MFAManager';

// Passport strategies
import './auth/strategies/local';
import './auth/strategies/saml';
import './auth/strategies/oidc';
import './auth/strategies/azure';
import './auth/strategies/google';
import './auth/strategies/github';
import './auth/strategies/ldap';

// Routes
import { authRouter } from './routes/auth';
import { ssoRouter } from './routes/sso';
import { auditRouter } from './routes/audit';
import { complianceRouter } from './routes/compliance';
import { mfaRouter } from './routes/mfa';
import { adminRouter } from './routes/admin';
import { healthRouter } from './routes/health';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8009;

// Initialize services
const ssoManager = new SSOManager();
const auditService = new AuditService();
const complianceManager = new ComplianceManager();
const securityManager = new SecurityManager();
const mfaManager = new MFAManager();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://neoai-ide.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-user-id', 'x-user-email', 'x-tenant-id'],
}));

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
const RedisStore = ConnectRedis(session);
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'neoai-enterprise-session-secret',
  resave: false,
  saveUninitialized: false,
  name: 'neoai.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
  },
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Request logging and audit
app.use(requestLogger);
app.use(auditLogger);

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

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
});

// Attach services to app for route access
app.locals.ssoManager = ssoManager;
app.locals.auditService = auditService;
app.locals.complianceManager = complianceManager;
app.locals.securityManager = securityManager;
app.locals.mfaManager = mfaManager;

// Routes
app.use('/health', healthRouter);
app.use('/auth', authLimiter, authRouter);
app.use('/sso', authLimiter, ssoRouter);
app.use('/audit', auditRouter);
app.use('/compliance', complianceRouter);
app.use('/mfa', authLimiter, mfaRouter);
app.use('/admin', adminRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'NeoAI IDE Enterprise Authentication Service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: [
      'Single Sign-On (SSO)',
      'SAML 2.0 authentication',
      'OpenID Connect (OIDC)',
      'Active Directory integration',
      'Multi-factor authentication (MFA)',
      'Audit logging',
      'Compliance framework',
      'Enterprise security',
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
    await ssoManager.initialize();
    await auditService.initialize();
    await complianceManager.initialize();
    await securityManager.initialize();
    await mfaManager.initialize();
    
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Enterprise Auth Service running on port ${PORT}`);
      logger.info(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔐 Enterprise authentication ready`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Cleanup services
          await ssoManager.cleanup();
          await auditService.cleanup();
          await complianceManager.cleanup();
          await securityManager.cleanup();
          await mfaManager.cleanup();
          
          await prisma.$disconnect();
          await redisClient.quit();
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
