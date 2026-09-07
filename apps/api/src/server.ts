import 'dotenv/config';
import { PrismaVoiceJobRepository } from '@cotali/database';
import { buildApp } from './app.js';
import { auth, prisma } from './auth/auth.js';
import {
  readTrustedOrigins,
  resolveBetterAuthBaseURL,
  resolveBetterAuthSecret,
} from './auth/better-auth.js';
import {
  BetterAuthAuthenticator,
  DevelopmentAuthenticator,
} from './auth/authenticator.js';
import { PrismaEngagementService } from './engagement/engagement-service.js';
import { PrismaProfileRepository } from './profile/prisma-profile-repository.js';
import { ProfileService } from './profile/profile-service.js';
import { PrismaQuoteRepository } from './quotes/prisma-quote-repository.js';
import { QuoteService } from './quotes/quote-service.js';
import { PrismaSecurityAuditService } from './security/security-audit-service.js';
import { PrismaOtpRateLimitService } from './security/otp-rate-limit-service.js';
import { GroqVoiceInterpreter } from './voice/groq-voice-interpreter.js';

const port = Number(process.env.PORT ?? 3333);
const voiceCommandInterpreter = process.env.GROQ_API_KEY
  ? new GroqVoiceInterpreter({
      apiKey: process.env.GROQ_API_KEY,
      commandModel: process.env.GROQ_COMMAND_MODEL,
      extractionModel: process.env.GROQ_EXTRACTION_MODEL,
      transcriptionModel: process.env.GROQ_TRANSCRIPTION_MODEL,
    })
  : undefined;
const app = await buildApp({
  auth,
  authenticator:
    process.env.AUTH_MODE === 'development' &&
    process.env.NODE_ENV !== 'production'
      ? new DevelopmentAuthenticator()
      : new BetterAuthAuthenticator(auth),
  engagementService: new PrismaEngagementService(prisma),
  profileService: new ProfileService(new PrismaProfileRepository(prisma)),
  quoteService: new QuoteService(new PrismaQuoteRepository(prisma)),
  securityAuditService: new PrismaSecurityAuditService(prisma),
  otpRateLimitService: new PrismaOtpRateLimitService(
    prisma,
    resolveBetterAuthSecret(),
  ),
  oauthTrustedOrigins: readTrustedOrigins(resolveBetterAuthBaseURL()),
  voiceCommandInterpreter,
  voiceJobRepository: new PrismaVoiceJobRepository(prisma),
});

app.addHook('onClose', async () => {
  await prisma.$disconnect();
});

await app.listen({ host: '0.0.0.0', port });
