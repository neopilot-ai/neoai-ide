import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for user ID in headers (from API Gateway)
    const userIdHeader = req.headers['x-user-id'] as string;
    const userEmailHeader = req.headers['x-user-email'] as string;

    if (userIdHeader && userEmailHeader) {
      // User authenticated by API Gateway
      const user = await prisma.user.findUnique({
        where: { id: userIdHeader },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        res.status(401).json({
          error: 'User not found or inactive',
        });
        return;
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
      };

      next();
      return;
    }

    // Fallback to JWT authentication
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid authorization token',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured');
      res.status(500).json({
        error: 'Server configuration error',
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      
      // Validate token payload
      if (!decoded.id || !decoded.email) {
        res.status(401).json({
          error: 'Invalid token payload',
        });
        return;
      }

      // Check token expiration
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        res.status(401).json({
          error: 'Token expired',
          message: 'Please log in again',
        });
        return;
      }

      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        res.status(401).json({
          error: 'User not found or inactive',
        });
        return;
      }

      // Attach user to request
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
      };

      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          error: 'Token expired',
          message: 'Please log in again',
        });
        return;
      }

      if (jwtError instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          error: 'Invalid token',
          message: 'Please provide a valid authorization token',
        });
        return;
      }

      throw jwtError;
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred while validating your credentials',
    });
  }
};

export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const userIdHeader = req.headers['x-user-id'];
  
  if (!authHeader && !userIdHeader) {
    // No authentication provided, continue without user
    next();
    return;
  }

  // Authentication provided, validate it
  await authMiddleware(req, res, next);
};

export const requirePlan = (requiredPlan: string | string[]) => {
  const plans = Array.isArray(requiredPlan) ? requiredPlan : [requiredPlan];
  const planHierarchy = ['FREE', 'PRO', 'TEAM', 'ENTERPRISE'];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
      });
      return;
    }

    const userPlanIndex = planHierarchy.indexOf(req.user.plan.toUpperCase());
    const requiredPlanIndex = Math.min(...plans.map(plan => planHierarchy.indexOf(plan.toUpperCase())));

    if (userPlanIndex < requiredPlanIndex) {
      res.status(403).json({
        error: 'Insufficient plan',
        message: `This feature requires ${plans.join(' or ')} plan`,
        currentPlan: req.user.plan,
        requiredPlan: plans,
      });
      return;
    }

    next();
  };
};

export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
      });
      return;
    }

    // For now, we'll implement basic role checking
    // In a full implementation, roles would be stored in the user object
    const userRole = (req.user as any).role || 'user';
    
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires ${allowedRoles.join(' or ')} role`,
        currentRole: userRole,
        requiredRoles: allowedRoles,
      });
      return;
    }

    next();
  };
};
