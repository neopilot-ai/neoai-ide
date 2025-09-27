import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { requirePlan } from '../middleware/auth';

const router = express.Router();

// Validation rules
const createProjectValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Project name must be 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('framework').optional().isIn(['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxtjs', 'express', 'fastapi', 'django', 'flask', 'other']).withMessage('Invalid framework'),
  body('language').optional().isIn(['javascript', 'typescript', 'python', 'java', 'cpp', 'rust', 'go', 'php', 'ruby', 'other']).withMessage('Invalid language'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
];

const updateProjectValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Project name must be 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('framework').optional().isIn(['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxtjs', 'express', 'fastapi', 'django', 'flask', 'other']).withMessage('Invalid framework'),
  body('language').optional().isIn(['javascript', 'typescript', 'python', 'java', 'cpp', 'rust', 'go', 'php', 'ruby', 'other']).withMessage('Invalid language'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
];

// Get all projects for user
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, framework, language, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      userId: req.user!.id,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (framework) {
      where.framework = framework;
    }

    if (language) {
      where.language = language;
    }

    // Build order by
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        select: {
          id: true,
          name: true,
          description: true,
          framework: true,
          language: true,
          isPublic: true,
          gitUrl: true,
          createdAt: true,
          updatedAt: true,
          lastOpenedAt: true,
          _count: {
            select: {
              files: true,
            },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({
      projects,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({
      error: 'Failed to get projects',
    });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
      include: {
        files: {
          orderBy: {
            path: 'asc',
          },
        },
        _count: {
          select: {
            files: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
      });
    }

    // Update last opened timestamp
    await prisma.project.update({
      where: { id },
      data: { lastOpenedAt: new Date() },
    });

    res.json({ project });
  } catch (error) {
    logger.error('Get project error:', error);
    res.status(500).json({
      error: 'Failed to get project',
    });
  }
});

// Create new project
router.post('/', createProjectValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { name, description, framework, language = 'javascript', isPublic = false, templateId } = req.body;

    // Check project limit based on user plan
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { plan: true },
    });

    const projectCount = await prisma.project.count({
      where: { userId: req.user!.id },
    });

    const planLimits = {
      FREE: 3,
      PRO: 50,
      TEAM: 200,
      ENTERPRISE: -1, // Unlimited
    };

    const limit = planLimits[user?.plan as keyof typeof planLimits] || 3;
    if (limit !== -1 && projectCount >= limit) {
      return res.status(403).json({
        error: 'Project limit reached',
        message: `Your ${user?.plan} plan allows up to ${limit} projects`,
        currentCount: projectCount,
        limit,
      });
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name,
        description,
        framework,
        language,
        isPublic,
        userId: req.user!.id,
        lastOpenedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            files: true,
          },
        },
      },
    });

    // If template is specified, copy template files
    if (templateId) {
      try {
        await copyTemplateFiles(project.id, templateId);
      } catch (templateError) {
        logger.warn('Failed to copy template files:', templateError);
        // Don't fail project creation if template copy fails
      }
    }

    logger.info(`Project created: ${project.name} by ${req.user!.email}`);

    res.status(201).json({
      message: 'Project created successfully',
      project,
    });
  } catch (error) {
    logger.error('Create project error:', error);
    res.status(500).json({
      error: 'Failed to create project',
    });
  }
});

// Update project
router.put('/:id', updateProjectValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const { name, description, framework, language, isPublic, settings } = req.body;

    // Check if project exists and user owns it
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
    });

    if (!existingProject) {
      return res.status(404).json({
        error: 'Project not found',
      });
    }

    // Update project
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (framework !== undefined) updateData.framework = framework;
    if (language !== undefined) updateData.language = language;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (settings !== undefined) updateData.settings = settings;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            files: true,
          },
        },
      },
    });

    logger.info(`Project updated: ${project.name} by ${req.user!.email}`);

    res.json({
      message: 'Project updated successfully',
      project,
    });
  } catch (error) {
    logger.error('Update project error:', error);
    res.status(500).json({
      error: 'Failed to update project',
    });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists and user owns it
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
      });
    }

    // Delete project (cascade will handle files)
    await prisma.project.delete({
      where: { id },
    });

    logger.info(`Project deleted: ${project.name} by ${req.user!.email}`);

    res.json({
      message: 'Project deleted successfully',
    });
  } catch (error) {
    logger.error('Delete project error:', error);
    res.status(500).json({
      error: 'Failed to delete project',
    });
  }
});

// Duplicate project
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Check if source project exists and user owns it
    const sourceProject = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
      include: {
        files: true,
      },
    });

    if (!sourceProject) {
      return res.status(404).json({
        error: 'Source project not found',
      });
    }

    // Check project limit
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { plan: true },
    });

    const projectCount = await prisma.project.count({
      where: { userId: req.user!.id },
    });

    const planLimits = {
      FREE: 3,
      PRO: 50,
      TEAM: 200,
      ENTERPRISE: -1,
    };

    const limit = planLimits[user?.plan as keyof typeof planLimits] || 3;
    if (limit !== -1 && projectCount >= limit) {
      return res.status(403).json({
        error: 'Project limit reached',
        message: `Your ${user?.plan} plan allows up to ${limit} projects`,
      });
    }

    // Create duplicate project
    const duplicateProject = await prisma.project.create({
      data: {
        name: name || `${sourceProject.name} (Copy)`,
        description: sourceProject.description,
        framework: sourceProject.framework,
        language: sourceProject.language,
        isPublic: false, // Always create private copies
        userId: req.user!.id,
        settings: sourceProject.settings,
        lastOpenedAt: new Date(),
      },
    });

    // Duplicate files
    if (sourceProject.files.length > 0) {
      const fileData = sourceProject.files.map(file => ({
        name: file.name,
        path: file.path,
        content: file.content,
        size: file.size,
        language: file.language,
        isDirectory: file.isDirectory,
        parentId: file.parentId,
        projectId: duplicateProject.id,
      }));

      await prisma.file.createMany({
        data: fileData,
      });
    }

    logger.info(`Project duplicated: ${sourceProject.name} -> ${duplicateProject.name} by ${req.user!.email}`);

    res.status(201).json({
      message: 'Project duplicated successfully',
      project: duplicateProject,
    });
  } catch (error) {
    logger.error('Duplicate project error:', error);
    res.status(500).json({
      error: 'Failed to duplicate project',
    });
  }
});

// Get project statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists and user owns it
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
      });
    }

    // Get file statistics
    const fileStats = await prisma.file.groupBy({
      by: ['language'],
      where: {
        projectId: id,
        isDirectory: false,
      },
      _count: {
        id: true,
      },
      _sum: {
        size: true,
      },
    });

    const totalFiles = await prisma.file.count({
      where: {
        projectId: id,
        isDirectory: false,
      },
    });

    const totalSize = await prisma.file.aggregate({
      where: {
        projectId: id,
        isDirectory: false,
      },
      _sum: {
        size: true,
      },
    });

    const directoryCount = await prisma.file.count({
      where: {
        projectId: id,
        isDirectory: true,
      },
    });

    res.json({
      stats: {
        totalFiles,
        totalDirectories: directoryCount,
        totalSize: totalSize._sum.size || 0,
        filesByLanguage: fileStats.map(stat => ({
          language: stat.language,
          count: stat._count.id,
          size: stat._sum.size || 0,
        })),
        lastModified: project.updatedAt,
        created: project.createdAt,
      },
    });
  } catch (error) {
    logger.error('Get project stats error:', error);
    res.status(500).json({
      error: 'Failed to get project statistics',
    });
  }
});

// Helper function to copy template files
async function copyTemplateFiles(projectId: string, templateId: string) {
  // This would implement template file copying
  // For now, we'll just log the action
  logger.info(`Copying template ${templateId} to project ${projectId}`);
  
  // In a real implementation, this would:
  // 1. Fetch template files from a template repository
  // 2. Process any template variables
  // 3. Create the files in the new project
}

export { router as projectRouter };
