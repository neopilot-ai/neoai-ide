import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PreviewManager, PreviewConfig } from '../services/PreviewManager';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation rules
const createPreviewValidation = [
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('framework').isIn(['react', 'vue', 'angular', 'nextjs', 'nuxtjs', 'express', 'fastapi', 'django', 'python', 'static']).withMessage('Invalid framework'),
  body('buildCommand').optional().isString().withMessage('Build command must be a string'),
  body('startCommand').optional().isString().withMessage('Start command must be a string'),
  body('installCommand').optional().isString().withMessage('Install command must be a string'),
  body('port').optional().isInt({ min: 1000, max: 65535 }).withMessage('Port must be between 1000 and 65535'),
  body('envVars').optional().isObject().withMessage('Environment variables must be an object'),
];

const updatePreviewValidation = [
  param('envId').isUUID().withMessage('Invalid environment ID'),
  body('buildCommand').optional().isString().withMessage('Build command must be a string'),
  body('startCommand').optional().isString().withMessage('Start command must be a string'),
  body('envVars').optional().isObject().withMessage('Environment variables must be an object'),
];

// Create preview environment
router.post('/', createPreviewValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const {
      projectId,
      framework,
      buildCommand,
      startCommand,
      installCommand,
      port,
      envVars,
    } = req.body;

    const previewManager = req.app.locals.previewManager as PreviewManager;
    
    // Check if user already has a preview for this project
    const existingEnvironments = await previewManager.getEnvironmentsByProject(projectId);
    const userEnvironments = existingEnvironments.filter(env => env.userId === req.user!.id);
    
    if (userEnvironments.length > 0) {
      return res.status(409).json({
        error: 'Preview environment already exists',
        message: 'Only one preview environment per project is allowed',
        existingEnvironment: userEnvironments[0],
      });
    }

    const config: PreviewConfig = {
      framework,
      buildCommand,
      startCommand,
      installCommand,
      port,
      envVars,
    };

    const environment = await previewManager.createEnvironment(
      projectId,
      req.user!.id,
      config
    );

    logger.info(`Preview environment created: ${environment.id} by ${req.user!.email}`);

    res.status(201).json({
      message: 'Preview environment created successfully',
      environment,
    });
  } catch (error) {
    logger.error('Create preview error:', error);
    res.status(500).json({
      error: 'Failed to create preview environment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get preview environments for user
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    const previewManager = req.app.locals.previewManager as PreviewManager;

    let environments;
    if (projectId) {
      const allEnvironments = await previewManager.getEnvironmentsByProject(projectId as string);
      environments = allEnvironments.filter(env => env.userId === req.user!.id);
    } else {
      environments = await previewManager.getEnvironmentsByUser(req.user!.id);
    }

    res.json({
      environments,
      count: environments.length,
    });
  } catch (error) {
    logger.error('Get previews error:', error);
    res.status(500).json({
      error: 'Failed to get preview environments',
    });
  }
});

// Get specific preview environment
router.get('/:envId', async (req, res) => {
  try {
    const { envId } = req.params;
    const previewManager = req.app.locals.previewManager as PreviewManager;

    const environment = await previewManager.getEnvironment(envId);
    
    if (!environment) {
      return res.status(404).json({
        error: 'Preview environment not found',
      });
    }

    // Check if user owns this environment
    if (environment.userId !== req.user!.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this environment',
      });
    }

    // Update last accessed time
    environment.lastAccessed = new Date();

    res.json({
      environment,
    });
  } catch (error) {
    logger.error('Get preview error:', error);
    res.status(500).json({
      error: 'Failed to get preview environment',
    });
  }
});

// Start preview environment
router.post('/:envId/start', async (req, res) => {
  try {
    const { envId } = req.params;
    const previewManager = req.app.locals.previewManager as PreviewManager;

    const environment = await previewManager.getEnvironment(envId);
    
    if (!environment) {
      return res.status(404).json({
        error: 'Preview environment not found',
      });
    }

    if (environment.userId !== req.user!.id) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    if (environment.status === 'running') {
      return res.status(409).json({
        error: 'Environment already running',
        environment,
      });
    }

    const config: PreviewConfig = {
      framework: environment.framework,
      buildCommand: environment.buildCommand,
      startCommand: environment.startCommand,
      envVars: environment.envVars,
    };

    await previewManager.startEnvironment(envId, config);

    const updatedEnvironment = await previewManager.getEnvironment(envId);

    logger.info(`Preview environment started: ${envId} by ${req.user!.email}`);

    res.json({
      message: 'Preview environment started successfully',
      environment: updatedEnvironment,
    });
  } catch (error) {
    logger.error('Start preview error:', error);
    res.status(500).json({
      error: 'Failed to start preview environment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Stop preview environment
router.post('/:envId/stop', async (req, res) => {
  try {
    const { envId } = req.params;
    const previewManager = req.app.locals.previewManager as PreviewManager;

    const environment = await previewManager.getEnvironment(envId);
    
    if (!environment) {
      return res.status(404).json({
        error: 'Preview environment not found',
      });
    }

    if (environment.userId !== req.user!.id) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    await previewManager.stopEnvironment(envId);

    const updatedEnvironment = await previewManager.getEnvironment(envId);

    logger.info(`Preview environment stopped: ${envId} by ${req.user!.email}`);

    res.json({
      message: 'Preview environment stopped successfully',
      environment: updatedEnvironment,
    });
  } catch (error) {
    logger.error('Stop preview error:', error);
    res.status(500).json({
      error: 'Failed to stop preview environment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Restart preview environment
router.post('/:envId/restart', async (req, res) => {
  try {
    const { envId } = req.params;
    const previewManager = req.app.locals.previewManager as PreviewManager;

    const environment = await previewManager.getEnvironment(envId);
    
    if (!environment) {
      return res.status(404).json({
        error: 'Preview environment not found',
      });
    }

    if (environment.userId !== req.user!.id) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    await previewManager.restartEnvironment(envId);

    const updatedEnvironment = await previewManager.getEnvironment(envId);

    logger.info(`Preview environment restarted: ${envId} by ${req.user!.email}`);

    res.json({
      message: 'Preview environment restarted successfully',
      environment: updatedEnvironment,
    });
  } catch (error) {
    logger.error('Restart preview error:', error);
    res.status(500).json({
      error: 'Failed to restart preview environment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Update preview environment configuration
router.put('/:envId', updatePreviewValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { envId } = req.params;
    const { buildCommand, startCommand, envVars } = req.body;
    const previewManager = req.app.locals.previewManager as PreviewManager;

    const environment = await previewManager.getEnvironment(envId);
    
    if (!environment) {
      return res.status(404).json({
        error: 'Preview environment not found',
      });
    }

    if (environment.userId !== req.user!.id) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    // Update environment configuration
    if (buildCommand !== undefined) environment.buildCommand = buildCommand;
    if (startCommand !== undefined) environment.startCommand = startCommand;
    if (envVars !== undefined) environment.envVars = { ...environment.envVars, ...envVars };
    
    environment.updatedAt = new Date();

    logger.info(`Preview environment updated: ${envId} by ${req.user!.email}`);

    res.json({
      message: 'Preview environment updated successfully',
      environment,
    });
  } catch (error) {
    logger.error('Update preview error:', error);
    res.status(500).json({
      error: 'Failed to update preview environment',
    });
  }
});

// Delete preview environment
router.delete('/:envId', async (req, res) => {
  try {
    const { envId } = req.params;
    const previewManager = req.app.locals.previewManager as PreviewManager;

    const environment = await previewManager.getEnvironment(envId);
    
    if (!environment) {
      return res.status(404).json({
        error: 'Preview environment not found',
      });
    }

    if (environment.userId !== req.user!.id) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    await previewManager.stopEnvironment(envId);

    logger.info(`Preview environment deleted: ${envId} by ${req.user!.email}`);

    res.json({
      message: 'Preview environment deleted successfully',
    });
  } catch (error) {
    logger.error('Delete preview error:', error);
    res.status(500).json({
      error: 'Failed to delete preview environment',
    });
  }
});

// Get preview environment logs
router.get('/:envId/logs', async (req, res) => {
  try {
    const { envId } = req.params;
    const { lines = 100 } = req.query;
    const previewManager = req.app.locals.previewManager as PreviewManager;

    const environment = await previewManager.getEnvironment(envId);
    
    if (!environment) {
      return res.status(404).json({
        error: 'Preview environment not found',
      });
    }

    if (environment.userId !== req.user!.id) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    const logLines = parseInt(lines as string);
    const logs = environment.logs.slice(-logLines);

    res.json({
      logs,
      totalLines: environment.logs.length,
      environment: {
        id: environment.id,
        status: environment.status,
        updatedAt: environment.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Get logs error:', error);
    res.status(500).json({
      error: 'Failed to get preview logs',
    });
  }
});

// Get preview environment metrics
router.get('/:envId/metrics', async (req, res) => {
  try {
    const { envId } = req.params;
    const previewManager = req.app.locals.previewManager as PreviewManager;

    const environment = await previewManager.getEnvironment(envId);
    
    if (!environment) {
      return res.status(404).json({
        error: 'Preview environment not found',
      });
    }

    if (environment.userId !== req.user!.id) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    // TODO: Implement container metrics collection
    const metrics = {
      cpu: 0,
      memory: 0,
      network: {
        rx: 0,
        tx: 0,
      },
      uptime: environment.createdAt ? Date.now() - environment.createdAt.getTime() : 0,
      status: environment.status,
    };

    res.json({
      metrics,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('Get metrics error:', error);
    res.status(500).json({
      error: 'Failed to get preview metrics',
    });
  }
});

export { router as previewRouter };
