import 'dotenv/config';
import { PrismaClient } from '@cotali/database';
import { buildApp } from './app.js';
import { createAuthenticatorFromEnvironment } from './auth/authenticator-factory.js';
import { PrismaQuoteRepository } from './quotes/prisma-quote-repository.js';
import { QuoteService } from './quotes/quote-service.js';
import { GroqVoiceInterpreter } from './voice/groq-voice-interpreter.js';

const port = Number(process.env.PORT ?? 3333);
const prisma = new PrismaClient();
const app = await buildApp({
  authenticator: createAuthenticatorFromEnvironment(),
  quoteService: new QuoteService(new PrismaQuoteRepository(prisma)),
  voiceInterpreter: process.env.GROQ_API_KEY
    ? new GroqVoiceInterpreter({
        apiKey: process.env.GROQ_API_KEY,
        extractionModel: process.env.GROQ_EXTRACTION_MODEL,
        transcriptionModel: process.env.GROQ_TRANSCRIPTION_MODEL,
      })
    : undefined,
});

app.addHook('onClose', async () => {
  await prisma.$disconnect();
});

await app.listen({ host: '0.0.0.0', port });
