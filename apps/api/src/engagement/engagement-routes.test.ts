import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StaticAuthenticator } from '../auth/authenticator.js';
import type { EngagementService } from './engagement-service.js';
import { registerEngagementRoutes } from './engagement-routes.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.unstubAllEnvs();
});

describe('privacy policy version configuration', () => {
  it('fails closed when the approved policy version is missing', async () => {
    vi.stubEnv('PRIVACY_POLICY_VERSION', '');
    app = Fastify({ logger: false });
    const engagement = {
      recordMarketingConsent: vi.fn(),
    } as unknown as EngagementService;

    await expect(
      registerEngagementRoutes(app, new StaticAuthenticator(), engagement),
    ).rejects.toThrow('PRIVACY_POLICY_VERSION is required.');
  });
});
