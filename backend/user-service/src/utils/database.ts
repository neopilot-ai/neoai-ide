import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Singleton pattern for Prisma client
declare global {
  var __prisma: PrismaClient | undefined;
}

const prisma = globalThis.__prisma || new PrismaClient();

// Store the original prisma instance in global for reuse
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

export { prisma };
