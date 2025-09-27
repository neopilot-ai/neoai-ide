import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation rules
const updateProfileValidation = [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
];

const updatePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

const updatePreferencesValidation = [
  body('preferences').isObject().withMessage('Preferences must be an object'),
];

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        plan: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
        preferences: true,
        _count: {
          select: {
            projects: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({
      error: 'Failed to get user profile',
    });
  }
});

// Update user profile
router.put('/profile', authMiddleware, updateProfileValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { name, avatar } = req.body;
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        plan: true,
        emailVerified: true,
        updatedAt: true,
      },
    });

    logger.info(`User profile updated: ${user.email}`);

    res.json({
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    logger.error('Update user profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
    });
  }
});

// Update password
router.put('/password', authMiddleware, updatePasswordValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    if (!user || !user.password) {
      return res.status(400).json({
        error: 'Cannot update password for OAuth users',
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Current password is incorrect',
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword },
    });

    // Invalidate all refresh tokens to force re-login
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    logger.info(`Password updated for user: ${user.email}`);

    res.json({
      message: 'Password updated successfully',
    });
  } catch (error) {
    logger.error('Update password error:', error);
    res.status(500).json({
      error: 'Failed to update password',
    });
  }
});

// Update user preferences
router.put('/preferences', authMiddleware, updatePreferencesValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { preferences } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { preferences },
      select: {
        id: true,
        preferences: true,
        updatedAt: true,
      },
    });

    logger.info(`User preferences updated: ${req.user!.email}`);

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences,
    });
  } catch (error) {
    logger.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Failed to update preferences',
    });
  }
});

// Get user usage statistics
router.get('/usage', authMiddleware, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case 'day':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const usageRecords = await prisma.usageRecord.findMany({
      where: {
        userId: req.user!.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Aggregate usage by type
    const usage = usageRecords.reduce((acc, record) => {
      if (!acc[record.type]) {
        acc[record.type] = {
          amount: 0,
          cost: 0,
          count: 0,
        };
      }
      
      acc[record.type].amount += record.amount;
      acc[record.type].cost += record.cost || 0;
      acc[record.type].count += 1;
      
      return acc;
    }, {} as Record<string, { amount: number; cost: number; count: number }>);

    const totalCost = Object.values(usage).reduce((sum, item) => sum + item.cost, 0);

    res.json({
      period,
      startDate,
      endDate,
      usage,
      totalCost,
      recordCount: usageRecords.length,
    });
  } catch (error) {
    logger.error('Get usage statistics error:', error);
    res.status(500).json({
      error: 'Failed to get usage statistics',
    });
  }
});

// Delete user account
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    const { password, confirmation } = req.body;

    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        error: 'Invalid confirmation',
        message: 'Please type "DELETE_MY_ACCOUNT" to confirm',
      });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Verify password for non-OAuth users
    if (user.password && password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({
          error: 'Invalid password',
        });
      }
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: user.id },
    });

    logger.info(`User account deleted: ${user.email}`);

    res.json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      error: 'Failed to delete account',
    });
  }
});

// Get user projects summary
router.get('/projects/summary', authMiddleware, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        name: true,
        description: true,
        framework: true,
        language: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        lastOpenedAt: true,
        _count: {
          select: {
            files: true,
          },
        },
      },
      orderBy: {
        lastOpenedAt: 'desc',
      },
      take: 10, // Limit to recent projects
    });

    const totalProjects = await prisma.project.count({
      where: { userId: req.user!.id },
    });

    res.json({
      projects,
      totalProjects,
      recentProjects: projects.length,
    });
  } catch (error) {
    logger.error('Get projects summary error:', error);
    res.status(500).json({
      error: 'Failed to get projects summary',
    });
  }
});

export { router as userRouter };
