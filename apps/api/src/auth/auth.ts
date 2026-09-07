import { PrismaClient } from '@prisma/client';
import { createAuthEmailServiceFromEnvironment } from '../email/email-service.js';
import { createCotaliAuth } from './better-auth.js';

export const prisma = new PrismaClient();
export const auth = createCotaliAuth(
  prisma,
  createAuthEmailServiceFromEnvironment(),
);
