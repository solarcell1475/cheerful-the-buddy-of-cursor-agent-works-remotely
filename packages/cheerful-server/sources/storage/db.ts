import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient({
  log: process.env.DEBUG ? ['query', 'info', 'warn', 'error'] : ['error'],
});
