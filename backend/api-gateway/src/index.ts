import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { healthRouter } from './routes/health';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://neoai-ide.com', 'https://app.neoai-ide.com']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// API Documentation
if (process.env.ENABLE_SWAGGER === 'true') {
  try {
    const swaggerDocument = YAML.load('./docs/api.yaml');
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  } catch (error) {
    logger.warn('Could not load Swagger documentation');
  }
}

// Health check routes
app.use('/health', healthRouter);

// Service proxy configurations

type ProxyConfig = {
  target: string;
  pathRewrite: { [key: string]: string };
  middleware?: Array<(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => any>;
};

const serviceProxies: Record<string, ProxyConfig> = {
  '/api/auth': {
    target: process.env.USER_SERVICE_URL || 'http://localhost:8001',
    pathRewrite: { '^/api/auth': '/auth' },
  },
  '/api/users': {
    target: process.env.USER_SERVICE_URL || 'http://localhost:8001',
    pathRewrite: { '^/api/users': '/users' },
    middleware: [authMiddleware],
  },
  '/api/projects': {
    target: process.env.PROJECT_SERVICE_URL || 'http://localhost:8002',
    pathRewrite: { '^/api/projects': '/projects' },
    middleware: [authMiddleware],
  },
  '/api/files': {
    target: process.env.PROJECT_SERVICE_URL || 'http://localhost:8002',
    pathRewrite: { '^/api/files': '/files' },
    middleware: [authMiddleware],
  },
  '/api/ai': {
    target: process.env.AI_SERVICE_URL || 'http://localhost:8003',
    pathRewrite: { '^/api/ai': '/ai' },
    middleware: [authMiddleware],
  },
  '/api/agents': {
    target: process.env.AGENT_SERVICE_URL || 'http://localhost:8004',
    pathRewrite: { '^/api/agents': '/agents' },
    middleware: [authMiddleware],
  },
  '/api/git': {
    target: process.env.GIT_SERVICE_URL || 'http://localhost:8005',
    pathRewrite: { '^/api/git': '/git' },
    middleware: [authMiddleware],
  },
  '/api/preview': {
    target: process.env.PREVIEW_SERVICE_URL || 'http://localhost:8006',
    pathRewrite: { '^/api/preview': '/preview' },
    middleware: [authMiddleware],
  },
};

// Setup service proxies
Object.entries(serviceProxies).forEach(([path, config]) => {
  const { target, pathRewrite, middleware = [] } = config;
  
  // Apply middleware first
  if (middleware.length > 0) {
    app.use(path, ...middleware);
  }
  
  // Create proxy
  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${path}:`, err);
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: path,
      });
    },
    onProxyReq: (proxyReq, req) => {
      // Add request ID for tracing
      const requestId = typeof req.headers['x-request-id'] === 'string' 
        ? req.headers['x-request-id'] 
        : `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      proxyReq.setHeader('x-request-id', requestId);
      
      // Forward user information
      if (req.user && typeof req.user === 'object' && 'id' in req.user && 'email' in req.user) {
        const user = req.user as { id: string; email: string };
        proxyReq.setHeader('x-user-id', user.id);
        proxyReq.setHeader('x-user-email', user.email);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // Add CORS headers to proxied responses
      proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
      proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
    },
  });
  
  app.use(path, proxy);
});

// WebSocket proxy for real-time features
const wsProxy = createProxyMiddleware('/ws', {
  target: process.env.WEBSOCKET_SERVICE_URL || 'http://localhost:8007',
  ws: true,
  changeOrigin: true,
  onError: (err, req, socket) => {
    logger.error('WebSocket proxy error:', err);
    socket.destroy();
  },
});

app.use('/ws', wsProxy);

// Catch-all route for undefined endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'NeoAI IDE API Gateway',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    docs: process.env.ENABLE_SWAGGER === 'true' ? '/api/docs' : undefined,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 API Gateway running on port ${PORT}`);
  logger.info(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.ENABLE_SWAGGER === 'true') {
    logger.info(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default app;
