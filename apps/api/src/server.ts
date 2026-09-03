import 'dotenv/config';
import { PrismaClient, PrismaVoiceJobRepository } from '@cotali/database';
import { buildApp } from './app.js';
import { createAuthenticatorFromEnvironment } from './auth/authenticator-factory.js';
import { PrismaQuoteRepository } from './quotes/prisma-quote-repository.js';
import { QuoteService } from './quotes/quote-service.js';

const port = Number(process.env.PORT ?? 3333);
const prisma = new PrismaClient();
const app = await buildApp({
  authenticator: createAuthenticatorFromEnvironment(),
  quoteService: new QuoteService(new PrismaQuoteRepository(prisma)),
  voiceJobRepository: new PrismaVoiceJobRepository(prisma),
});

app.addHook('onClose', async () => {
  await prisma.$disconnect();
});

await app.listen({ host: '0.0.0.0', port });
