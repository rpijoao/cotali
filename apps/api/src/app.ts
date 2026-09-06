import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import type { VoiceJobRepository } from '@cotali/database';
import type { Auth } from 'better-auth';
import { registerBetterAuthRoutes } from './auth/auth-routes.js';
import type { Authenticator } from './auth/authenticator.js';
import { registerEngagementRoutes } from './engagement/engagement-routes.js';
import type { EngagementService } from './engagement/engagement-service.js';
import { registerProfileRoutes } from './profile/profile-routes.js';
import {
  MemoryProfileRepository,
  ProfileService,
} from './profile/profile-service.js';
import { registerQuoteRoutes } from './quotes/quote-routes.js';
import type { QuoteService } from './quotes/quote-service.js';
import type { SecurityAuditService } from './security/security-audit-service.js';
import type { OtpRateLimitService } from './security/otp-rate-limit-service.js';
import { registerVoiceRoutes } from './voice/voice-routes.js';
import type {
  VoiceCommandInterpreter,
  VoiceInterpreter,
} from './voice/groq-voice-interpreter.js';
import { MAX_AUDIO_BYTES } from './voice/voice-routes.js';

export async function buildApp(options: {
  authenticator: Authenticator;
  auth?: Pick<Auth, 'api' | 'handler'>;
  engagementService?: EngagementService;
  docsEnabled?: boolean;
  logger?: boolean;
  profileService?: ProfileService;
  quoteService: QuoteService;
  rateLimitMax?: number;
  securityAuditService?: SecurityAuditService;
  otpRateLimitService?: OtpRateLimitService;
  oauthTrustedOrigins?: readonly string[];
  voiceInterpreter?: VoiceInterpreter | undefined;
  voiceCommandInterpreter?: VoiceCommandInterpreter | undefined;
  voiceJobRepository?: VoiceJobRepository | undefined;
}) {
  const trustedProxyHops = readTrustedProxyHops();
  const app = Fastify({
    bodyLimit: 1_048_576,
    trustProxy: (_address, index) => index < trustedProxyHops,
    logger:
      options.logger === false
        ? false
        : {
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'res.headers["set-cookie"]',
              ],
              remove: true,
            },
          },
  });

  await app.register(helmet, { global: true });
  await app.register(cors, {
    credentials: true,
    origin: readAllowedOrigins(),
  });
  await app.register(rateLimit, {
    max: options.rateLimitMax ?? 100,
    timeWindow: '1 minute',
  });
  await app.register(multipart, {
    limits: { fileSize: MAX_AUDIO_BYTES, files: 1, parts: 4 },
  });

  if (options.docsEnabled ?? process.env.NODE_ENV !== 'production') {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'Cotali API',
          version: '0.1.0',
        },
      },
    });
    await app.register(swaggerUi, { routePrefix: '/docs' });
  }
  const profileService =
    options.profileService ?? new ProfileService(new MemoryProfileRepository());
  if (options.auth) {
    await registerBetterAuthRoutes(
      app,
      options.auth,
      options.securityAuditService,
      options.otpRateLimitService,
      options.oauthTrustedOrigins,
    );
  }
  await registerQuoteRoutes(
    app,
    options.authenticator,
    options.quoteService,
    profileService,
    options.engagementService,
  );
  await registerProfileRoutes(app, options.authenticator, profileService);
  await registerVoiceRoutes(
    app,
    options.authenticator,
    options.voiceInterpreter,
    options.voiceJobRepository,
    options.voiceCommandInterpreter,
  );
  if (options.engagementService) {
    await registerEngagementRoutes(
      app,
      options.authenticator,
      options.engagementService,
    );
  }

  app.get(
    '/v1/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              status: { type: 'string' },
            },
            required: ['name', 'status'],
          },
        },
      },
    },
    async () => ({ name: 'cotali-api', status: 'ok' }),
  );

  return app;
}

function readTrustedProxyHops(): number {
  const configured = process.env.TRUSTED_PROXY_HOPS?.trim();
  if (!configured) return 0;

  const hops = Number(configured);
  if (!Number.isInteger(hops) || hops < 0) {
    throw new Error(
      'TRUSTED_PROXY_HOPS deve ser um inteiro maior ou igual a zero.',
    );
  }
  return hops;
}

function readAllowedOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (configured?.length) return configured;

  if (process.env.NODE_ENV === 'production') {
    const productionOrigin = process.env.WEB_APP_URL?.trim();
    if (!productionOrigin) {
      throw new Error(
        'WEB_APP_URL ou CORS_ORIGINS deve ser configurado em produção.',
      );
    }
    return [productionOrigin];
  }

  return [
    process.env.WEB_APP_URL ?? 'http://localhost:3000',
    'http://localhost:8081',
  ];
}
