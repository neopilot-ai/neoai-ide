import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  logger.info(`Incoming transmission request: ${req.method} ${req.originalUrl} from ${req.ip}`);
  next();
};
