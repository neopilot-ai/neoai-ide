import express from 'express';
import { prisma } from '../utils/database';

const router = express.Router();

// Basic health check
router.get('/', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'user-service',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'user-service',
      error: 'Database connection failed',
    });
  }
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  const checks = {
    database: false,
    memory: false,
    uptime: false,
  };

  try {
    // Database check
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    // Database check failed
  }

  // Memory check (fail if using more than 1GB)
  const memoryUsage = process.memoryUsage();
  checks.memory = memoryUsage.heapUsed < 1024 * 1024 * 1024;

  // Uptime check (fail if less than 10 seconds)
  checks.uptime = process.uptime() > 10;

  const isHealthy = Object.values(checks).every(check => check);

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    service: 'user-service',
    version: '1.0.0',
    checks,
    uptime: process.uptime(),
    memory: memoryUsage,
    environment: process.env.NODE_ENV,
  });
});

export { router as healthRouter };
