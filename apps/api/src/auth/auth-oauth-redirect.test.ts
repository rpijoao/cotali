import { betterAuth } from 'better-auth';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerBetterAuthRoutes } from './auth-routes.js';
import { readTrustedOrigins } from './better-auth.js';

const AUTH_BASE_URL = 'http://localhost:3333';
const WEB_APP_URL = 'http://localhost:3000';
let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.unstubAllEnvs();
});

function createTestAuth() {
  return betterAuth({
    baseURL: AUTH_BASE_URL,
    basePath: '/v1/auth',
    secret: 'cotali-test-secret-that-is-long-enough',
    trustedOrigins: readTrustedOrigins(AUTH_BASE_URL),
    socialProviders: {
      google: {
        clientId: 'test-google-client-id',
        clientSecret: 'test-google-client-secret',
      },
    },
    rateLimit: { enabled: false },
  });
}

async function createTestApp(): Promise<FastifyInstance> {
  const auth = createTestAuth();
  app = Fastify({ logger: false });
  await registerBetterAuthRoutes(
    app,
    auth,
    undefined,
    undefined,
    readTrustedOrigins(AUTH_BASE_URL),
  );
  return app;
}

async function sendSocialRequest(
  fastify: FastifyInstance,
  callbackURL: string,
): Promise<Awaited<ReturnType<FastifyInstance['inject']>>> {
  return fastify.inject({
    method: 'POST',
    url: '/v1/auth/sign-in/social',
    headers: {
      'content-type': 'application/json',
      origin: WEB_APP_URL,
    },
    payload: { provider: 'google', callbackURL },
  });
}

describe('Better Auth OAuth redirect allowlist', () => {
  it('accepts relative and explicitly configured web callbacks', async () => {
    vi.stubEnv('AUTH_TRUSTED_ORIGINS', `${WEB_APP_URL},cotali://`);
    const fastify = await createTestApp();

    const relativeResponse = await sendSocialRequest(
      fastify,
      '/login?oauth=complete',
    );
    const absoluteResponse = await sendSocialRequest(
      fastify,
      `${WEB_APP_URL}/login?oauth=complete`,
    );

    expect(relativeResponse.statusCode).not.toBe(403);
    expect(absoluteResponse.statusCode).not.toBe(403);
    expect(relativeResponse.headers.location).toMatch(
      /^https:\/\/accounts\.google\.com\//,
    );
    expect(absoluteResponse.headers.location).toMatch(
      /^https:\/\/accounts\.google\.com\//,
    );
  });

  it('rejects an untrusted callback before starting the provider flow', async () => {
    vi.stubEnv('AUTH_TRUSTED_ORIGINS', `${WEB_APP_URL},cotali://`);
    const fastify = await createTestApp();

    const response = await sendSocialRequest(
      fastify,
      'https://attacker.example/phishing',
    );

    expect(response.statusCode).toBe(403);
    expect(response.body).not.toContain('attacker.example');
    expect(response.headers.location).toBeUndefined();
  });

  it('requires explicit production origins and rejects production wildcards', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_TRUSTED_ORIGINS', 'https://app.example.com,cotali://');

    expect(readTrustedOrigins('https://api.example.com')).toEqual([
      'https://api.example.com',
      'https://app.example.com',
      'cotali://',
    ]);

    vi.stubEnv('AUTH_TRUSTED_ORIGINS', 'https://*.example.com');
    expect(() => readTrustedOrigins('https://api.example.com')).toThrow(
      'não pode conter curingas em produção',
    );

    vi.stubEnv('AUTH_TRUSTED_ORIGINS', '');
    expect(() => readTrustedOrigins('https://api.example.com')).toThrow(
      'AUTH_TRUSTED_ORIGINS is required in production.',
    );
  });
});
