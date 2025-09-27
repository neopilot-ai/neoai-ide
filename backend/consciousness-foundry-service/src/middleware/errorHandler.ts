import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled error in Consciousness Foundry: ${err.message}`, { stack: err.stack });

  res.status(500).json({
    error: 'A critical error occurred in the Consciousness Foundry Service.',
    message: err.message,
  });
};
