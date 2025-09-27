import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });

  res.status(500).json({
    error: 'An internal server error occurred in the Neural Interface Service.',
    message: err.message,
  });
};
