import 'dotenv/config';
import { PrismaClient, PrismaVoiceJobRepository } from '@cotali/database';
import { buildApp } from './app.js';
import { createAuthenticatorFromEnvironment } from './auth/authenticator-factory.js';
import { PrismaProfileRepository } from './profile/prisma-profile-repository.js';
import { ProfileService } from './profile/profile-service.js';
import { PrismaQuoteRepository } from './quotes/prisma-quote-repository.js';
import { QuoteService } from './quotes/quote-service.js';
import { GroqVoiceInterpreter } from './voice/groq-voice-interpreter.js';

const port = Number(process.env.PORT ?? 3333);
const prisma = new PrismaClient();
const voiceCommandInterpreter = process.env.GROQ_API_KEY
  ? new GroqVoiceInterpreter({
      apiKey: process.env.GROQ_API_KEY,
      commandModel: process.env.GROQ_COMMAND_MODEL,
      extractionModel: process.env.GROQ_EXTRACTION_MODEL,
      transcriptionModel: process.env.GROQ_TRANSCRIPTION_MODEL,
    })
  : undefined;
const app = await buildApp({
  authenticator: createAuthenticatorFromEnvironment(),
  profileService: new ProfileService(new PrismaProfileRepository(prisma)),
  quoteService: new QuoteService(new PrismaQuoteRepository(prisma)),
  voiceCommandInterpreter,
  voiceJobRepository: new PrismaVoiceJobRepository(prisma),
});

app.addHook('onClose', async () => {
  await prisma.$disconnect();
});

await app.listen({ host: '0.0.0.0', port });
