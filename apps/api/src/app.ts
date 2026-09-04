import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import type { VoiceJobRepository } from '@cotali/database';
import type { Authenticator } from './auth/authenticator.js';
import { registerQuoteRoutes } from './quotes/quote-routes.js';
import type { QuoteService } from './quotes/quote-service.js';
import { registerVoiceRoutes } from './voice/voice-routes.js';
import type {
  VoiceCommandInterpreter,
  VoiceInterpreter,
} from './voice/groq-voice-interpreter.js';
import { MAX_AUDIO_BYTES } from './voice/voice-routes.js';

export async function buildApp(options: {
  authenticator: Authenticator;
  docsEnabled?: boolean;
  logger?: boolean;
  quoteService: QuoteService;
  rateLimitMax?: number;
  voiceInterpreter?: VoiceInterpreter | undefined;
  voiceCommandInterpreter?: VoiceCommandInterpreter | undefined;
  voiceJobRepository?: VoiceJobRepository | undefined;
}) {
  const app = Fastify({
    bodyLimit: 1_048_576,
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
  await registerQuoteRoutes(app, options.authenticator, options.quoteService);
  await registerVoiceRoutes(
    app,
    options.authenticator,
    options.voiceInterpreter,
    options.voiceJobRepository,
    options.voiceCommandInterpreter,
  );

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
