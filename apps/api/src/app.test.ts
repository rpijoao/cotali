import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  DevelopmentAuthenticator,
  StaticAuthenticator,
} from './auth/authenticator.js';
import { buildApp } from './app.js';
import { QuoteService } from './quotes/quote-service.js';

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
});

describe('GET /v1/health', () => {
  it('reports that the API is ready', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });
    const response = await app.inject({ method: 'GET', url: '/v1/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ name: 'cotali-api', status: 'ok' });
  }, 15_000);
});

describe('POST /v1/quotes', () => {
  const input = {
    mutationId: '73070f7c-a464-47d7-90bf-b06ac2ce7a1e',
    client: { name: 'Maria Silva', phone: '+5511999999999' },
    conditions: {
      executionDeadline: 'Até cinco dias úteis',
      installmentCount: 3,
      notes: null,
      paymentMethod: 'Pix ou cartão',
      paymentPlanType: 'installments',
      validUntil: '2026-09-30',
    },
    discountInCents: 500,
    materials: [
      {
        description: 'Tomada',
        quantity: '4',
        unit: 'un',
        unitPriceInCents: 1500,
      },
    ],
    services: [
      {
        description: 'Troca de tomada',
        quantity: '2',
        unit: 'un',
        unitPriceInCents: 5000,
      },
    ],
    source: 'manual',
  } as const;

  it('creates an idempotent manual draft with server totals', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });

    const first = await app.inject({
      method: 'POST',
      payload: input,
      url: '/v1/quotes',
    });
    const retry = await app.inject({
      method: 'POST',
      payload: input,
      url: '/v1/quotes',
    });

    expect(first.statusCode).toBe(201);
    expect(retry.statusCode).toBe(201);
    expect(retry.json()).toEqual(first.json());
    expect(first.json()).toMatchObject({
      revisionNumber: 1,
      status: 'draft',
      totals: {
        discountInCents: 500,
        materialsInCents: 6000,
        servicesInCents: 10000,
        subtotalInCents: 16000,
        totalInCents: 15500,
      },
    });
  });

  it('rejects incoherent payment conditions', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });
    const response = await app.inject({
      method: 'POST',
      payload: {
        ...input,
        conditions: { ...input.conditions, installmentCount: null },
      },
      url: '/v1/quotes',
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({
      error: { code: 'INVALID_PAYMENT_PLAN' },
    });
  });

  it('rejects an unauthenticated request', async () => {
    app = await buildApp({
      authenticator: new DevelopmentAuthenticator(),
      logger: false,
      quoteService: new QuoteService(),
    });
    const response = await app.inject({
      method: 'POST',
      payload: input,
      url: '/v1/quotes',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: 'AUTHENTICATION_REQUIRED' },
    });
  });
});

describe('HTTP security baseline', () => {
  it('sets security headers and can disable API documentation', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      docsEnabled: false,
      logger: false,
      quoteService: new QuoteService(),
    });

    const health = await app.inject({ method: 'GET', url: '/v1/health' });
    const docs = await app.inject({ method: 'GET', url: '/docs' });

    expect(health.headers['x-content-type-options']).toBe('nosniff');
    expect(health.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(docs.statusCode).toBe(404);
  });

  it('limits excessive requests', async () => {
    app = await buildApp({
      authenticator: new StaticAuthenticator(),
      docsEnabled: false,
      logger: false,
      quoteService: new QuoteService(),
      rateLimitMax: 1,
    });

    const first = await app.inject({ method: 'GET', url: '/v1/health' });
    const limited = await app.inject({ method: 'GET', url: '/v1/health' });

    expect(first.statusCode).toBe(200);
    expect(limited.statusCode).toBe(429);
  });
});
