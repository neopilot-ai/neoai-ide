import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const message = err instanceof Error ? err.message : 'Unknown error';
  const stack = err instanceof Error && err.stack ? err.stack : undefined;

  logger.error('Unhandled error:', { message, stack, path: req.path });

  res.status(500).json({
    error: 'Internal Server Error',
    message,
  });
};
