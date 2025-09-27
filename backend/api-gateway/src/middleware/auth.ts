import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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

      // Attach user to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        plan: decoded.plan || 'free',
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
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without authentication
    next();
    return;
  }

  // Token provided, validate it
  await authMiddleware(req, res, next);
};

export const requirePlan = (requiredPlan: string | string[]) => {
  const plans = Array.isArray(requiredPlan) ? requiredPlan : [requiredPlan];
  const planHierarchy = ['free', 'pro', 'team', 'enterprise'];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
      });
      return;
    }

    const userPlanIndex = planHierarchy.indexOf(req.user.plan);
    const requiredPlanIndex = Math.min(...plans.map(plan => planHierarchy.indexOf(plan)));

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
