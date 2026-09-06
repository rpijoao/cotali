import type { Auth } from 'better-auth';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerBetterAuthRoutes } from './auth-routes.js';
import type { SecurityAuditService } from '../security/security-audit-service.js';
import type { OtpRateLimitService } from '../security/otp-rate-limit-service.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
});

describe('Better Auth security audit route', () => {
  it('records a successful session logout without credentials', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const audit: SecurityAuditService = {
      record,
    };
    const auth = {
      api: {
        getSession: vi.fn().mockResolvedValue({ user: { id: 'auth-user-1' } }),
      },
      handler: vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    } as unknown as Pick<Auth, 'api' | 'handler'>;
    app = Fastify({ logger: false });
    await registerBetterAuthRoutes(app, auth, audit);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-out',
      headers: { cookie: 'better-auth.session_token=redacted-test-cookie' },
    });

    expect(response.statusCode).toBe(204);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        authSubject: 'auth-user-1',
        method: 'POST',
        name: 'session_sign_out',
        outcome: 'success',
        path: '/v1/auth/sign-out',
        statusCode: 204,
      }),
    );
    expect(JSON.stringify(record.mock.calls)).not.toContain(
      'redacted-test-cookie',
    );
  });

  it('classifies a rate-limited OTP request as a failed security event', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const audit: SecurityAuditService = {
      record,
    };
    const auth = {
      api: { getSession: vi.fn().mockResolvedValue(null) },
      handler: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Too many requests' }), {
          headers: { 'content-type': 'application/json' },
          status: 429,
        }),
      ),
    } as unknown as Pick<Auth, 'api' | 'handler'>;
    app = Fastify({ logger: false });
    await registerBetterAuthRoutes(app, auth, audit);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/email-otp/send-verification-otp',
    });

    expect(response.statusCode).toBe(429);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'rate_limited',
        outcome: 'failure',
        path: '/v1/auth/email-otp/send-verification-otp',
        statusCode: 429,
      }),
    );
  });

  it('keeps the auth response available when audit persistence fails', async () => {
    const record = vi
      .fn()
      .mockRejectedValue(new Error('audit database unavailable'));
    const audit: SecurityAuditService = {
      record,
    };
    const auth = {
      api: { getSession: vi.fn().mockResolvedValue(null) },
      handler: vi.fn().mockResolvedValue(new Response('ok', { status: 200 })),
    } as unknown as Pick<Auth, 'api' | 'handler'>;
    app = Fastify({ logger: false });
    await registerBetterAuthRoutes(app, auth, audit);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/get-session',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('ok');
  });

  it('blocks an OTP request before Better Auth when the email and IP bucket is exhausted', async () => {
    const consume = vi.fn().mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 42,
    });
    const otpRateLimit: OtpRateLimitService = { consume };
    const handler = vi.fn();
    const auth = {
      api: { getSession: vi.fn().mockResolvedValue(null) },
      handler,
    } as unknown as Pick<Auth, 'api' | 'handler'>;
    app = Fastify({ logger: false });
    await registerBetterAuthRoutes(app, auth, undefined, otpRateLimit);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/email-otp/send-verification-otp',
      headers: { 'content-type': 'application/json' },
      payload: { email: ' Professional@Example.com ' },
    });

    expect(response.statusCode).toBe(429);
    expect(response.headers['x-retry-after']).toBe('42');
    expect(response.json()).toEqual({
      message: 'Too many requests. Please try again later.',
    });
    expect(consume).toHaveBeenCalledWith({
      email: 'professional@example.com',
      ip: expect.any(String),
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
